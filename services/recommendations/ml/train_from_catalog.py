"""
Обучение content-based рекомендателя на РЕАЛЬНОМ каталоге CoWatch
(content_items/watch_events прод-базы recommendations_db на Railway), а не
на MovieLens (см. ml/train.py — тот тренируется на 9742 фильмах MovieLens с
movieId в качестве content_id, это удобный публичный бенчмарк, но НЕ то,
что реально отдаёт GET /recommendations/{user_id} на проде).

Отдельный скрипт, а не флаг у ml/train.py, потому что коннект-стринг здесь
обязателен и явный (--database-url), без дефолта на settings.database_url:
тренировать нужно против ПУБЛИЧНОГО хоста Railway, не той локальной/internal
БД, что настроена в .env для повседневной разработки — дефолт на settings
слишком легко случайно перепутать с прод-базой.

Запуск (из services/recommendations, venv активирован):
    python -m ml.train_from_catalog --database-url "postgresql://user:pass@host:port/recommendations_db"

При малом числе watch_events (<2 на пользователя) evaluate_leave_one_out
возвращает нулевые метрики — это ожидаемо (см. вывод скрипта), не баг.
"""
import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

import joblib
import pandas as pd
from app.core.config import settings
from app.models.content import ContentItem
from app.models.interaction import WatchEvent
from app.services.recommender import ContentRecommender
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


def _to_asyncpg_url(raw_url: str) -> str:
    """
    Railway отдаёт публичный connection string как
    postgresql://user:pass@host:port/db (psycopg-стиль). SQLAlchemy async
    нужен драйвер asyncpg: postgresql+asyncpg://... . sslmode=... в query
    string — синтаксис psycopg2, asyncpg его не понимает и падает на
    подключении, поэтому вырезаем (Railway публичный прокси не требует
    отдельного управления TLS через этот параметр).
    """
    parts = urlsplit(raw_url)
    scheme = parts.scheme
    if scheme == "postgres":
        scheme = "postgresql"
    if "+asyncpg" not in scheme:
        scheme = scheme.replace("postgresql", "postgresql+asyncpg", 1)

    query_pairs = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() != "sslmode"]
    query = urlencode(query_pairs)

    return urlunsplit((scheme, parts.netloc, parts.path, query, parts.fragment))


async def load_from_catalog_db(database_url: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    engine = create_async_engine(_to_asyncpg_url(database_url))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as session:
            content_rows = (await session.execute(select(ContentItem))).scalars().all()
            interaction_rows = (
                await session.execute(select(WatchEvent).where(WatchEvent.content_id.isnot(None)))
            ).scalars().all()
    finally:
        await engine.dispose()

    content_df = pd.DataFrame(
        [
            {
                "content_id": c.id,
                "title": c.title,
                "genres": c.genres or [],
                "overview": c.overview or "",
                "poster_path": c.poster_path,
                "release_year": c.release_year,
            }
            for c in content_rows
        ]
    )
    interactions_df = pd.DataFrame(
        [{"user_id": w.user_id, "content_id": w.content_id, "joined_at": w.joined_at} for w in interaction_rows]
    )
    return content_df, interactions_df


def train_and_save(content_df: pd.DataFrame, interactions_df: pd.DataFrame, k: int = 10) -> dict:
    if content_df.empty:
        raise SystemExit("content_items пуст — нечего обучать. Проверь --database-url и что каталог загружен (ml/import_catalog.py).")

    model = ContentRecommender(k_default=k)
    model.fit(content_df, interactions_df)

    if interactions_df.empty:
        print("watch_events пуст — метрики недоступны, модель обучена только на content_items (genres/overview).")
        metrics = model.evaluate_leave_one_out(interactions_df, k=k)
    else:
        metrics = model.evaluate_leave_one_out(interactions_df, k=k)
        if metrics.n_eval_users == 0:
            print(
                "n_eval_users = 0: ни у одного пользователя нет >=2 watch_events "
                "(evaluate_leave_one_out прячет последний просмотр и проверяет, попадёт ли он "
                "обратно в top-K по остальным — для этого нужно минимум 2 просмотра у пользователя). "
                "Метрики precision/recall/hit_rate поэтому нулевые — это ожидаемо при малом "
                "количестве реальных watch_events, не баг модели."
            )

    model_dir = Path(settings.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "latest.joblib"
    joblib.dump(model, model_path)

    meta = {
        "model_version": f"catalog-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_items": len(content_df),
        "n_users": int(interactions_df["user_id"].nunique()) if not interactions_df.empty else 0,
        "n_interactions": len(interactions_df),
        "precision_at_k": metrics.precision_at_k,
        "recall_at_k": metrics.recall_at_k,
        "hit_rate_at_k": metrics.hit_rate_at_k,
        "k": k,
        "source": "catalog",
    }
    (model_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    print(f"Saved: {model_path}")
    print(json.dumps(meta, indent=2, ensure_ascii=False))
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database-url",
        required=True,
        help="Публичный connection string recommendations_db на Railway (Connect / Settings -> Networking)",
    )
    parser.add_argument("--k", type=int, default=10)
    args = parser.parse_args()

    content_df, interactions_df = asyncio.run(load_from_catalog_db(args.database_url))
    print(f"Loaded {len(content_df)} content_items, {len(interactions_df)} watch_events "
          f"({interactions_df['user_id'].nunique() if not interactions_df.empty else 0} unique users)")

    train_and_save(content_df, interactions_df, k=args.k)


if __name__ == "__main__":
    main()
