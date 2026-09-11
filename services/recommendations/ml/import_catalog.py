"""
Загрузка каталога фильмов/сериалов из TMDB в нашу таблицу content_items.

Запуск (нужен поднятый Postgres recommendations_db и TMDB_API_KEY в .env):

    cd services/recommendations
    python -m ml.import_catalog                    # 5 страниц movie + 5 страниц tv (по 20 карточек на странице)
    python -m ml.import_catalog --media-type movie  # только фильмы
    python -m ml.import_catalog --pages 10          # больше страниц = больше каталог

Идемпотентно: повторный запуск обновляет уже загруженные карточки
(по tmdb_id), а не плодит дубли — можно спокойно гонять раз в неделю,
чтобы каталог не устаревал.
"""
import argparse
import asyncio

from app.core.config import settings
from app.database import Base
from app.models.content import ContentItem
from app.services.tmdb_client import TMDBClient
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

MEDIA_TYPES = ("movie", "tv")


async def import_media_type(session: AsyncSession, client: TMDBClient, media_type: str, pages: int) -> int:
    genre_map = await client.genre_map(media_type)
    imported = 0

    for page in range(1, pages + 1):
        raw_items = await client.fetch_popular(media_type, page=page)
        if not raw_items:
            break  # TMDB кончились страницы раньше, чем мы попросили

        for raw in raw_items:
            content = TMDBClient.to_content_dict(raw, media_type, genre_map)

            stmt = pg_insert(ContentItem).values(**content).on_conflict_do_update(
                index_elements=["tmdb_id", "media_type"],
                set_={k: v for k, v in content.items() if k not in ("tmdb_id", "media_type")},
            )
            await session.execute(stmt)
            imported += 1

    await session.commit()
    return imported


async def main_async(media_types: list[str], pages: int):
    client = TMDBClient()
    if not client.enabled:
        raise SystemExit(
            "TMDB_API_KEY не задан. Проверь .env в корне репозитория "
            "(и что services/recommendations читает его — см. app/core/config.py)."
        )

    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        for media_type in media_types:
            count = await import_media_type(session, client, media_type, pages)
            print(f"{media_type}: загружено/обновлено {count} карточек")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--media-type", choices=MEDIA_TYPES, default=None, help="Только movie или только tv (по умолчанию — оба)")
    parser.add_argument("--pages", type=int, default=5, help="Сколько страниц TMDB листать (20 карточек на странице)")
    args = parser.parse_args()

    media_types = [args.media_type] if args.media_type else list(MEDIA_TYPES)
    asyncio.run(main_async(media_types, args.pages))


if __name__ == "__main__":
    main()
