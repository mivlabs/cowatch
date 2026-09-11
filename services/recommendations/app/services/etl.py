"""
Батч-синхронизация watch_events из rooms_db в recommendations_db.

Переписано на room.content_id (11.09.2026) — старая версия пыталась
угадывать фильм по кривому названию из rooms.current_movie_title через
TMDBClient.search_movie() (см. историю решения в README сервиса). Теперь
это не нужно: пользователь выбирает фильм ИЗ каталога при создании комнаты
(см. frontend/src/pages/CreateRoomPage.tsx), room.content_id уже указывает
прямо на content_items.id — угадывать нечего, TMDB здесь больше не участвует
вообще.

Осознанное упрощение MVP (см. core/config.py): читаем чужую БД read-only
вместо event streaming. В проде это Kafka/Debezium CDC на изменения
participants/rooms — здесь достаточно cron/Airflow-таска раз в N минут
(см. README, roadmap).

Идемпотентность: upsert по (room_id, user_id), поэтому повторный запуск
безопасен и не плодит дубли.
"""
import logging
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models.content import ContentItem
from app.models.interaction import WatchEvent

logger = logging.getLogger(__name__)

_ROOMS_QUERY = text(
    """
    SELECT p.room_id::text AS room_id,
           p.user_id       AS user_id,
           r.content_id    AS content_id,
           p.joined_at     AS joined_at
    FROM participants p
    JOIN rooms r ON r.id = p.room_id
    WHERE r.content_id IS NOT NULL
    """
)


async def fetch_room_watch_events(rooms_engine: AsyncEngine) -> list[dict]:
    async with rooms_engine.connect() as conn:
        result = await conn.execute(_ROOMS_QUERY)
        return [dict(row._mapping) for row in result]


async def sync_watch_events(session, rooms_engine: AsyncEngine, tmdb_client=None) -> dict:
    """
    Возвращает сводку для логов/мониторинга ETL-запуска.

    tmdb_client оставлен как необязательный параметр только ради обратной
    совместимости с вызовом из роутера (app/routers/recommendations.py) —
    сама функция его больше не использует, TMDB здесь не нужен.
    """
    raw_events = await fetch_room_watch_events(rooms_engine)

    # Название нужно только для читаемости в watch_events (денормализация,
    # не источник правды) — подтягиваем title одним запросом по всем
    # content_id разом, а не по одному на событие в цикле.
    content_ids = {e["content_id"] for e in raw_events if e["content_id"] is not None}
    title_by_content_id: dict[int, str] = {}
    if content_ids:
        rows = await session.execute(
            select(ContentItem.id, ContentItem.title).where(ContentItem.id.in_(content_ids))
        )
        title_by_content_id = {row.id: row.title for row in rows}

    synced = 0
    skipped_unknown_content = 0

    for event in raw_events:
        content_id = event["content_id"]
        title = title_by_content_id.get(content_id)
        if content_id is None or title is None:
            # room.content_id указывает на строку, которой почему-то нет в
            # content_items (например, каталог переимпортировали и id
            # изменились) — пропускаем, не роняем весь батч.
            skipped_unknown_content += 1
            continue

        stmt = pg_insert(WatchEvent).values(
            room_id=event["room_id"],
            user_id=event["user_id"],
            content_title=title,
            content_id=content_id,
            joined_at=event["joined_at"],
            synced_at=datetime.utcnow(),
        ).on_conflict_do_update(
            index_elements=["room_id", "user_id"],
            set_={
                "content_title": title,
                "content_id": content_id,
                "synced_at": datetime.utcnow(),
            },
        )
        await session.execute(stmt)
        synced += 1

    await session.commit()
    summary = {
        "raw_events": len(raw_events),
        "synced": synced,
        "skipped_unknown_content": skipped_unknown_content,
    }
    logger.info("ETL sync_watch_events: %s", summary)
    return summary
