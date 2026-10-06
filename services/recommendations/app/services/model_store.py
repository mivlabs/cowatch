"""
Модель в памяти сервиса: обучается из базы при старте и переобучается по
расписанию.

Раньше API читал models/latest.joblib — файл, обученный вручную 12.09 и
закоммиченный в репозиторий. Любое изменение каталога или новые просмотры
до рекомендаций не доходили, пока кто-то не переобучит и не задеплоит.
Теперь источник правды — recommendations_db: при старте сервис
подтягивает content_items + watch_events, обучает ContentRecommender
(на пару тысяч карточек это секунды) и повторяет это каждые
RETRAIN_INTERVAL_HOURS, перед этим синхронизируя просмотры из rooms_db.

Обучение идёт в фоновой задаче, чтобы не задерживать старт: пока модели
нет, GET /recommendations отвечает 503, фронт в этом случае просто не
показывает блок "Для вас".
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.models.content import ContentItem
from app.models.interaction import WatchEvent
from app.services.etl import sync_watch_events
from app.services.recommender import ContentRecommender

logger = logging.getLogger(__name__)


async def load_training_frames(session: AsyncSession) -> tuple[pd.DataFrame, pd.DataFrame]:
    """content_df + interactions_df из recommendations_db в формате ContentRecommender.fit()."""
    content_rows = (await session.execute(select(ContentItem))).scalars().all()
    interaction_rows = (
        await session.execute(select(WatchEvent).where(WatchEvent.content_id.isnot(None)))
    ).scalars().all()

    content_df = pd.DataFrame(
        [
            {
                "content_id": c.id,
                "title": c.title,
                "media_type": c.media_type,
                "genres": c.genres or [],
                "overview": c.overview or "",
                "popularity": c.popularity or 0.0,
                "vote_average": c.vote_average or 0.0,
                "vote_count": c.vote_count or 0,
                "poster_path": c.poster_path,
                "release_year": c.release_year,
            }
            for c in content_rows
        ]
    )
    interactions_df = pd.DataFrame(
        [{"user_id": w.user_id, "content_id": w.content_id, "joined_at": w.joined_at} for w in interaction_rows],
        columns=["user_id", "content_id", "joined_at"],
    )
    return content_df, interactions_df


class ModelStore:
    def __init__(self) -> None:
        self.model: ContentRecommender | None = None
        self.meta: dict = {}
        self._lock = asyncio.Lock()

    @property
    def loaded(self) -> bool:
        return self.model is not None

    async def sync_from_rooms(self, session: AsyncSession) -> dict | None:
        """ETL просмотров из rooms_db. Любая ошибка (нет доступа, нет переменной
        ROOMS_DATABASE_URL на хостинге) — не повод оставаться без модели:
        логируем и обучаемся на том, что уже есть в watch_events."""
        if not settings.rooms_database_url:
            return None
        rooms_engine = create_async_engine(settings.rooms_database_url)
        try:
            return await sync_watch_events(session, rooms_engine)
        except Exception as exc:  # noqa: BLE001 — любая проблема с чужой БД не должна ронять обучение
            logger.warning("ETL из rooms_db не удался, обучаемся на текущих watch_events: %s", exc)
            await session.rollback()
            return None
        finally:
            await rooms_engine.dispose()

    async def refresh(self, session: AsyncSession, sync_rooms: bool = True) -> dict:
        async with self._lock:
            etl_summary = await self.sync_from_rooms(session) if sync_rooms else None
            content_df, interactions_df = await load_training_frames(session)

            if content_df.empty:
                logger.warning("content_items пуст — модель не обучена, запусти ml/import_catalog.py")
                self.model = None
                self.meta = {}
                return {"trained": False, "reason": "empty_catalog", "etl": etl_summary}

            model = ContentRecommender(k_default=settings.default_top_k, min_votes=settings.min_votes)
            # fit() — чистый CPU (TF-IDF на пару тысяч текстов), уводим из event loop.
            await asyncio.to_thread(model.fit, content_df, interactions_df)
            metrics = await asyncio.to_thread(model.evaluate_leave_one_out, interactions_df, settings.default_top_k)

            trained_at = datetime.now(timezone.utc)
            self.model = model
            self.meta = {
                "model_version": f"db-{trained_at.strftime('%Y%m%dT%H%M%SZ')}",
                "trained_at": trained_at.isoformat(),
                "n_items": int(model.n_items),
                "n_eligible": int(model.n_eligible),
                "n_users": int(interactions_df["user_id"].nunique()) if not interactions_df.empty else 0,
                "n_interactions": int(len(interactions_df)),
                "precision_at_k": metrics.precision_at_k,
                "recall_at_k": metrics.recall_at_k,
                "hit_rate_at_k": metrics.hit_rate_at_k,
                "k": settings.default_top_k,
                "source": "db",
            }
            logger.info("Модель рекомендаций обучена: %s", self.meta)
            return {"trained": True, "etl": etl_summary, **self.meta}

    async def run_forever(self, session_factory, interval_hours: float) -> None:
        """Фоновый цикл: обучиться сразу, потом раз в interval_hours."""
        while True:
            try:
                async with session_factory() as session:
                    await self.refresh(session)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 — цикл должен пережить любой сбой и попробовать снова
                logger.exception("Переобучение модели рекомендаций упало, повторим через %s ч", interval_hours)
            await asyncio.sleep(interval_hours * 3600)


store = ModelStore()
