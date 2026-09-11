"""
Настройки сервиса рекомендаций.

DATABASE_URL       — собственная БД recommendations_db (content, watch_events).
ROOMS_DATABASE_URL — read-only доступ к rooms_db другого сервиса. Это
                      осознанное упрощение для MVP: вместо event-стриминга
                      (Kafka/Debezium CDC) ETL просто читает чужую таблицу
                      напрямую по расписанию. Честно задокументировано в
                      README сервиса как технический долг №1 — не выдавать
                      это на собеседовании за "полноценный event-driven pipeline".
TMDB_API_KEY        — ключ themoviedb.org для обогащения метаданных (жанры,
                      описание, постер). Без ключа ETL и train.py работают
                      в degraded-режиме: используют только сырой title из
                      rooms и content-based фичи ограничены заголовком.
MLFLOW_TRACKING_URI — по умолчанию локальная файловая папка ./mlruns.
                      Поднять полноценный MLflow-сервер — roadmap-пункт.
"""
import os

from pathlib import Path
from pydantic_settings import BaseSettings

_parents = Path(__file__).resolve().parents
_env_path = _parents[4] / ".env" if len(_parents) > 4 else None


class Settings(BaseSettings):
    service_name: str = "recommendations"

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/recommendations_db",
    )
    rooms_database_url: str = os.getenv(
        "ROOMS_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/rooms_db",
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/4")

    tmdb_api_key: str = os.getenv("TMDB_API_KEY", "")
    tmdb_base_url: str = "https://api.themoviedb.org/3"

    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns")
    mlflow_experiment_name: str = "cowatch-recommendations"

    model_dir: str = os.getenv("MODEL_DIR", "models")
    default_top_k: int = 10

    class Config:
        env_file = str(_env_path) if _env_path and _env_path.exists() else None
        extra = "ignore"
        protected_namespaces = ()

settings = Settings()
