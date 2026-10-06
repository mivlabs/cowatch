import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import settings
from app.database import async_session, get_db
from app.models.interaction import WatchEvent
from app.schemas.recommendation import ModelInfo, RecommendationsResponse
from app.services.catalog_import import import_catalog
from app.services.etl import sync_watch_events
from app.services.model_store import store
from app.services.tmdb_client import TMDBClient

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


_import_state: dict = {"running": False, "last": None}


async def _run_catalog_import(pages: int, min_votes: int) -> None:
    _import_state["running"] = True
    try:
        async with async_session() as session:
            summary = await import_catalog(session, TMDBClient(), pages=pages, min_votes=min_votes)
            retrain = await store.refresh(session)
        _import_state["last"] = {
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "catalog": summary,
            "model": retrain,
        }
    except Exception as exc:  # noqa: BLE001 — результат нужно показать в /admin/import-catalog, не потерять в логах
        logger.exception("Импорт каталога упал")
        _import_state["last"] = {"finished_at": datetime.now(timezone.utc).isoformat(), "error": str(exc)}
    finally:
        _import_state["running"] = False


@router.post("/admin/import-catalog")
async def trigger_catalog_import(
    pages: int = Query(default=25, ge=1, le=100, description="Страниц каждой подборки TMDB (20 карточек на странице)"),
    min_votes: int = Query(default=20, ge=0),
):
    """
    Догрузить каталог из TMDB изнутри сервиса (база доступна по внутреннему
    адресу, публичный не нужен) и сразу переобучить модель. Работает в фоне:
    сотня страниц TMDB — это минута-другая, дольше, чем стоит держать HTTP-
    запрос. Прогресс и итог — GET /admin/import-catalog.
    """
    if not TMDBClient().enabled:
        raise HTTPException(status_code=503, detail="TMDB_API_KEY не задан в окружении сервиса")
    if _import_state["running"]:
        return {"started": False, "running": True, "last": _import_state["last"]}

    asyncio.create_task(_run_catalog_import(pages, min_votes))
    return {"started": True, "running": True, "last": _import_state["last"]}


@router.get("/admin/import-catalog")
async def catalog_import_status():
    return _import_state


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
