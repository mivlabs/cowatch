"""
Обучение + оценка collaborative filtering рекомендателя (TruncatedSVD) —
второй кандидат рядом с content-based (ml/train.py). Тот же MovieLens,
та же метрика (precision@k/recall@k/hit_rate@k), тот же MLflow-эксперимент
(отдельный run с тегом model_type=collaborative) — чтобы сравнивать
результаты напрямую в MLflow UI, а не в разных местах.

Запуск:
    cd services/recommendations
    python -m ml.train_collaborative --movielens data\\movielens\\ml-latest-small --k 10
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import mlflow
from app.core.config import settings
from app.services.collaborative_recommender import CollaborativeRecommender

from ml.train import load_movielens, load_sample


def train_and_evaluate(content_df, interactions_df, k: int = 10, n_factors: int = 50) -> dict:
    if content_df.empty or interactions_df.empty:
        raise SystemExit("Нет данных для обучения.")

    model = CollaborativeRecommender(k_default=k, n_factors=n_factors)
    model.fit(content_df, interactions_df)
    metrics = model.evaluate_leave_one_out(interactions_df, k=k)

    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.mlflow_experiment_name)

    with mlflow.start_run() as run:
        mlflow.set_tag("model_type", "collaborative_svd")
        mlflow.log_params(
            {
                "model_type": "collaborative_svd",
                "n_factors": n_factors,
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

        # Модель на диск — вот этого раньше не хватало. model.fit() уже
        # обучен на ВСЕХ данных (evaluate_leave_one_out обучает свою
        # временную модель внутри себя и не трогает эту), так что это
        # готовый к раздаче в проде объект, не "урезанный" ради оценки.
        model_dir = Path(settings.model_dir)
        model_dir.mkdir(parents=True, exist_ok=True)
        model_path = model_dir / "collaborative_latest.joblib"
        joblib.dump(model, model_path)
        mlflow.log_artifact(str(model_path))

        meta = {
            "model_version": run.info.run_id,
            "model_type": "collaborative_svd",
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "n_items": len(content_df),
            "n_users": int(interactions_df["user_id"].nunique()),
            "n_interactions": len(interactions_df),
            "precision_at_k": metrics.precision_at_k,
            "recall_at_k": metrics.recall_at_k,
            "hit_rate_at_k": metrics.hit_rate_at_k,
            "k": k,
            "n_factors": n_factors,
        }
        (model_dir / "collaborative_meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))

        print(f"MLflow run: {run.info.run_id}")
        print(f"Модель сохранена: {model_path}")
        print(json.dumps(meta, indent=2, ensure_ascii=False))
        return meta


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", action="store_true")
    parser.add_argument("--movielens", type=str, default=None)
    parser.add_argument("--k", type=int, default=10)
    parser.add_argument("--n-factors", type=int, default=50, help="Размер латентного вектора (по умолчанию 50)")
    args = parser.parse_args()

    if args.movielens:
        content_df, interactions_df = load_movielens(Path(args.movielens))
    elif args.sample:
        content_df, interactions_df = load_sample()
    else:
        raise SystemExit("Укажи --movielens <путь> или --sample")

    train_and_evaluate(content_df, interactions_df, k=args.k, n_factors=args.n_factors)


if __name__ == "__main__":
    main()
