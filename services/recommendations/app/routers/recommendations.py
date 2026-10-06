import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import settings
from app.database import get_db
from app.models.interaction import WatchEvent
from app.schemas.recommendation import ModelInfo, RecommendationsResponse
from app.services.etl import sync_watch_events
from app.services.model_store import store

logger = logging.getLogger(__name__)
router = APIRouter(tags=["recommendations"])


@router.get("/recommendations/{user_id}", response_model=RecommendationsResponse)
async def get_recommendations(
    user_id: int,
    k: int = Query(default=settings.default_top_k, ge=1, le=50),
    db=Depends(get_db),
):
    """
    Две стратегии (см. app/services/recommender.py):

    1. У пользователя есть просмотры в watch_events → content-based: профиль
       из его просмотров, похожесть по жанрам и описанию, умноженная на
       приор популярности и рейтинга.
    2. Просмотров нет (новый пользователь или гость — у гостей id случайный
       на каждый вход) → популярное по рейтингу и популярности TMDB с
       бонусом за реальные совместные просмотры.

    Модель живёт в памяти (app/services/model_store.py), обучается при
    старте из базы и переобучается по расписанию.
    """
    if store.model is None:
        raise HTTPException(
            status_code=503,
            detail="Модель ещё не обучена: каталог пуст или обучение при старте не завершилось.",
        )

    result = await db.execute(
        select(WatchEvent.content_id).where(WatchEvent.user_id == user_id, WatchEvent.content_id.isnot(None))
    )
    user_content_ids = [row[0] for row in result.all()]

    strategy = "content_based" if user_content_ids else "popularity_cold_start"
    items = store.model.recommend_for_user(user_content_ids, k=k)

    return RecommendationsResponse(
        user_id=user_id,
        strategy=strategy,
        model_version=store.meta.get("model_version"),
        generated_at=datetime.now(timezone.utc),
        items=items,
    )


@router.get("/admin/model-info", response_model=ModelInfo)
async def model_info():
    if not store.meta:
        raise HTTPException(status_code=404, detail="Модель ещё не обучена")
    return ModelInfo(**store.meta)


@router.post("/admin/retrain")
async def trigger_retrain(db=Depends(get_db)):
    """Синхронизировать просмотры и переобучить модель прямо сейчас, не
    дожидаясь расписания — например, сразу после импорта каталога."""
    return await store.refresh(db)


@router.post("/admin/sync-watch-events")
async def trigger_sync(db=Depends(get_db)):
    """
    Батч-синхронизация watch_events из rooms_db (по room.content_id — см.
    app/services/etl.py). Раньше был сломан (пытался угадывать фильм по
    названию через TMDB search) — переписан под чистую привязку
    room.content_id -> content_items, угадывать больше нечего.

    Осознанное упрощение MVP: читаем чужую БД read-only по HTTP-триггеру
    вместо event streaming (Kafka/Debezium CDC) — см. README, roadmap.
    Тот же шаг выполняется автоматически перед каждым переобучением.
    """
    rooms_engine: AsyncEngine = create_async_engine(settings.rooms_database_url)
    try:
        summary = await sync_watch_events(db, rooms_engine)
    finally:
        await rooms_engine.dispose()
    return summary
