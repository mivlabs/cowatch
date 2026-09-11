import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import joblib
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import settings
from app.database import get_db
from app.models.interaction import WatchEvent
from app.schemas.recommendation import ModelInfo, RecommendationsResponse
from app.services.etl import sync_watch_events

logger = logging.getLogger(__name__)
router = APIRouter(tags=["recommendations"])

_CONTENT_MODEL_PATH = Path(settings.model_dir) / "latest.joblib"
_CONTENT_META_PATH = Path(settings.model_dir) / "meta.json"
_COLLABORATIVE_MODEL_PATH = Path(settings.model_dir) / "collaborative_latest.joblib"
_COLLABORATIVE_META_PATH = Path(settings.model_dir) / "collaborative_meta.json"


def _load_content_model():
    if not _CONTENT_MODEL_PATH.exists():
        return None
    return joblib.load(_CONTENT_MODEL_PATH)


def _load_collaborative_model():
    if not _COLLABORATIVE_MODEL_PATH.exists():
        return None
    return joblib.load(_COLLABORATIVE_MODEL_PATH)


def _load_meta(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text())


@router.get("/recommendations/{user_id}", response_model=RecommendationsResponse)
async def get_recommendations(
    user_id: int,
    k: int = Query(default=settings.default_top_k, ge=1, le=50),
    db=Depends(get_db),
):
    """
    Стратегия выбора модели (см. README, раздел "Метрики на MovieLens" —
    почему именно так):

    1. Пользователь "тёплый" для collaborative filtering (был в обучающих
       данных, латентный вектор реально выучен) → CF, лучший вариант
       (hit_rate@10 = 7.21% на MovieLens против 0.33% у content-based).
    2. Пользователь "холодный" для CF (не было в обучении, вектора нет), но
       есть история просмотров → content-based, он строит профиль на лету
       из любого списка content_id, ему не нужно было "видеть" пользователя
       заранее.
    3. Совсем холодный (ни истории, ни модели) → popularity fallback.
    """
    result = await db.execute(
        select(WatchEvent.content_id).where(WatchEvent.user_id == user_id, WatchEvent.content_id.isnot(None))
    )
    user_content_ids = [row[0] for row in result.all()]
    watched = set(user_content_ids)

    collaborative_model = _load_collaborative_model()
    content_model = _load_content_model()

    if collaborative_model is None and content_model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Ни одна модель ещё не обучена. Запусти ml/train.py "
                "(content-based) и/или ml/train_collaborative.py (CF)."
            ),
        )

    if collaborative_model is not None and collaborative_model.is_known_user(user_id):
        strategy = "collaborative"
        items = collaborative_model.recommend_for_user_id(user_id, k=k, watched=watched)
        meta = _load_meta(_COLLABORATIVE_META_PATH)
    elif content_model is not None:
        strategy = "content_based_cold_start" if user_content_ids else "popularity_cold_start"
        items = content_model.recommend_for_user(user_content_ids, k=k)
        meta = _load_meta(_CONTENT_META_PATH)
    else:
        # Content-based не обучен вовсе, а CF для этого юзера холодный —
        # последний резерв: популярное по CF-модели.
        strategy = "popularity_cold_start"
        items = collaborative_model.most_popular(k=k, exclude=watched)
        meta = _load_meta(_COLLABORATIVE_META_PATH)

    return RecommendationsResponse(
        user_id=user_id,
        strategy=strategy,
        model_version=meta.get("model_version"),
        generated_at=datetime.now(timezone.utc),
        items=items,
    )


@router.get("/admin/model-info", response_model=ModelInfo)
async def model_info(
    model: str = Query(default="collaborative", description="'collaborative' или 'content' — какую модель показать"),
):
    path = _COLLABORATIVE_META_PATH if model == "collaborative" else _CONTENT_META_PATH
    meta = _load_meta(path)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Модель '{model}' ещё не обучена")
    return ModelInfo(**meta)


@router.post("/admin/sync-watch-events")
async def trigger_sync(db=Depends(get_db)):
    """
    Батч-синхронизация watch_events из rooms_db (по room.content_id — см.
    app/services/etl.py). Раньше был сломан (пытался угадывать фильм по
    названию через TMDB search) — переписан под чистую привязку
    room.content_id -> content_items, угадывать больше нечего.

    Осознанное упрощение MVP: читаем чужую БД read-only по HTTP-триггеру
    вместо event streaming (Kafka/Debezium CDC) — см. README, roadmap.
    Дёргать вручную или по расписанию (Airflow DAG — тоже roadmap, пока
    вручную).
    """
    rooms_engine: AsyncEngine = create_async_engine(settings.rooms_database_url)
    try:
        summary = await sync_watch_events(db, rooms_engine)
    finally:
        await rooms_engine.dispose()
    return summary
