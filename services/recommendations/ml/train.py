"""
Обучение + оценка content-based рекомендателя, с трекингом в MLflow.

Запуск (локально, без Docker):
    cd services/recommendations
    DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/recommendations_db \
        python -m ml.train

Без поднятой БД (для быстрой проверки/CI/демо) — на встроенном сэмпле:
    python -m ml.train --sample

Что логируется в MLflow (mlflow ui --backend-store-uri ./mlruns, чтобы посмотреть):
  params:  vectorizer_max_features, vectorizer_min_df, k, n_items, n_users, n_interactions
  metrics: precision_at_k, recall_at_k, hit_rate_at_k
  artifact: сериализованная модель (joblib)

После обучения модель дополнительно сохраняется в services/recommendations/models/
(latest.joblib + meta.json) — это и есть файл, который читает API при отдаче
рекомендаций (см. app/routers/recommendations.py). Разделение "MLflow трекает
эксперименты" / "простой файл раздаёт продакшену" — осознанное упрощение MVP,
полноценный MLflow Model Registry + автоматический promotion — roadmap.
"""
import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import mlflow
import pandas as pd
from app.core.config import settings
from app.models.content import ContentItem
from app.models.interaction import WatchEvent
from app.services.recommender import ContentRecommender
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

SAMPLE_DIR = Path(__file__).resolve().parents[1] / "data"


def load_sample() -> tuple[pd.DataFrame, pd.DataFrame]:
    content_df = pd.read_csv(SAMPLE_DIR / "sample_content.csv")
    content_df["genres"] = content_df["genres"].apply(lambda s: s.split("|") if isinstance(s, str) else [])
    interactions_df = pd.read_csv(SAMPLE_DIR / "sample_watch_events.csv", parse_dates=["joined_at"])
    return content_df, interactions_df


def load_movielens(data_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Публичный бенчмарк вместо своих ~40 строк — грузим стандартный
    MovieLens ml-latest-small (grouplens.org): 9742 фильма, ~100k оценок,
    610 пользователей. Если рядом лежит movies_enriched.csv (см.
    ml/enrich_movielens.py) — используем его: там есть overview из TMDB,
    без него — только genres, сигнала для TF-IDF заметно меньше
    (см. README, раздел "Метрики").
    """
    enriched_path = data_dir / "movies_enriched.csv"
    if enriched_path.exists():
        movies = pd.read_csv(enriched_path)
        movies["genres"] = movies["genres"].apply(
            lambda s: [] if s == "(no genres listed)" else str(s).split("|")
        )
        movies["overview"] = movies["overview"].fillna("")
        content_df = movies.rename(columns={"movieId": "content_id"})[
            ["content_id", "title", "genres", "overview"]
        ]
    else:
        movies = pd.read_csv(data_dir / "movies.csv")
        movies["genres"] = movies["genres"].apply(
            lambda s: [] if s == "(no genres listed)" else s.split("|")
        )
        content_df = movies.rename(columns={"movieId": "content_id"})[["content_id", "title", "genres"]]
        content_df["overview"] = ""

    ratings = pd.read_csv(data_dir / "ratings.csv")
    interactions_df = pd.DataFrame(
        {
            "user_id": ratings["userId"],
            "content_id": ratings["movieId"],
            "joined_at": pd.to_datetime(ratings["timestamp"], unit="s"),
        }
    )
    return content_df, interactions_df


async def load_from_db() -> tuple[pd.DataFrame, pd.DataFrame]:
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        content_rows = (await session.execute(select(ContentItem))).scalars().all()
        interaction_rows = (
            await session.execute(select(WatchEvent).where(WatchEvent.content_id.isnot(None)))
        ).scalars().all()

    await engine.dispose()

    content_df = pd.DataFrame(
        [{"content_id": c.id, "title": c.title, "genres": c.genres or [], "overview": c.overview or ""} for c in content_rows]
    )
    interactions_df = pd.DataFrame(
        [{"user_id": w.user_id, "content_id": w.content_id, "joined_at": w.joined_at} for w in interaction_rows]
    )
    return content_df, interactions_df


def train_and_evaluate(content_df: pd.DataFrame, interactions_df: pd.DataFrame, k: int = 10) -> dict:
    if content_df.empty or interactions_df.empty:
        raise SystemExit(
            "Нет данных для обучения. Прогони POST /admin/sync-watch-events, "
            "или используй --sample для демонстрационного прогона."
        )

    model = ContentRecommender(k_default=k)
    model.fit(content_df, interactions_df)
    metrics = model.evaluate_leave_one_out(interactions_df, k=k)

    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.mlflow_experiment_name)

    with mlflow.start_run() as run:
        mlflow.log_params(
            {
                "genre_vectorizer_max_features": model.genre_vectorizer.max_features,
                "overview_vectorizer_max_features": model.overview_vectorizer.max_features,
                "overview_vectorizer_min_df": model.overview_vectorizer.min_df,
                "overview_vectorizer_max_df": model.overview_vectorizer.max_df,
                "genre_weight": model.genre_weight,
                "overview_weight": model.overview_weight,
                "k": k,
                "n_items": len(content_df),
                "n_users": interactions_df["user_id"].nunique(),
                "n_interactions": len(interactions_df),
            }
        )
        mlflow.log_metrics(
            {
                "precision_at_k": metrics.precision_at_k,
                "recall_at_k": metrics.recall_at_k,
                "hit_rate_at_k": metrics.hit_rate_at_k,
            }
        )

        model_dir = Path(settings.model_dir)
        model_dir.mkdir(parents=True, exist_ok=True)
        model_path = model_dir / "latest.joblib"
        joblib.dump(model, model_path)
        mlflow.log_artifact(str(model_path))

        meta = {
            "model_version": run.info.run_id,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "n_items": len(content_df),
            "n_users": int(interactions_df["user_id"].nunique()),
            "n_interactions": len(interactions_df),
            "precision_at_k": metrics.precision_at_k,
            "recall_at_k": metrics.recall_at_k,
            "hit_rate_at_k": metrics.hit_rate_at_k,
            "k": k,
        }
        (model_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))

        print(f"MLflow run: {run.info.run_id}")
        print(json.dumps(meta, indent=2, ensure_ascii=False))
        return meta


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", action="store_true", help="Обучиться на встроенном демо-сэмпле вместо БД")
    parser.add_argument("--movielens", type=str, default=None, help="Путь к распакованному ml-latest-small (папка с movies.csv/ratings.csv)")
    parser.add_argument("--k", type=int, default=10)
    args = parser.parse_args()

    if args.movielens:
        content_df, interactions_df = load_movielens(Path(args.movielens))
    elif args.sample:
        content_df, interactions_df = load_sample()
    else:
        content_df, interactions_df = asyncio.run(load_from_db())

    train_and_evaluate(content_df, interactions_df, k=args.k)


if __name__ == "__main__":
    main()
