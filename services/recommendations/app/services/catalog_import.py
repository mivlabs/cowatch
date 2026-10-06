"""
Загрузка каталога из TMDB в content_items — общая часть для
ml/import_catalog.py (запуск с компьютера) и POST /admin/import-catalog
(запуск изнутри сервиса, где база доступна без публичного адреса).

Что отсеивается на входе (см. TMDBClient.is_wanted): сериалы жанров
News/Talk/Soap/Reality и карточки с числом голосов меньше min_votes.
Идемпотентно: upsert по (tmdb_id, media_type).
"""
from __future__ import annotations

import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import ContentItem
from app.services.tmdb_client import LISTS, TMDBClient

logger = logging.getLogger(__name__)

MEDIA_TYPES = ("movie", "tv")


async def import_media_type(
    session: AsyncSession,
    client: TMDBClient,
    media_type: str,
    pages: int,
    lists: tuple[str, ...] = LISTS,
    min_votes: int = 0,
) -> dict:
    genre_map = await client.genre_map(media_type)
    seen: set[int] = set()
    imported = 0
    skipped = 0

    for list_name in lists:
        for page in range(1, pages + 1):
            raw_items = await client.fetch_list(media_type, list_name, page=page)
            if not raw_items:
                break  # TMDB кончились страницы раньше, чем мы попросили

            for raw in raw_items:
                if raw["id"] in seen:
                    continue  # popular и top_rated пересекаются
                seen.add(raw["id"])

                if not TMDBClient.is_wanted(raw, media_type, min_votes=min_votes):
                    skipped += 1
                    continue

                content = TMDBClient.to_content_dict(raw, media_type, genre_map)
                stmt = pg_insert(ContentItem).values(**content).on_conflict_do_update(
                    index_elements=["tmdb_id", "media_type"],
                    set_={k: v for k, v in content.items() if k not in ("tmdb_id", "media_type")},
                )
                await session.execute(stmt)
                imported += 1

        await session.commit()

    return {"imported": imported, "skipped": skipped}


async def import_catalog(
    session: AsyncSession,
    client: TMDBClient,
    media_types: tuple[str, ...] = MEDIA_TYPES,
    pages: int = 25,
    lists: tuple[str, ...] = LISTS,
    min_votes: int = 20,
) -> dict:
    summary = {}
    for media_type in media_types:
        summary[media_type] = await import_media_type(
            session, client, media_type, pages, lists=lists, min_votes=min_votes
        )
        logger.info("Импорт каталога %s: %s", media_type, summary[media_type])
    return summary
