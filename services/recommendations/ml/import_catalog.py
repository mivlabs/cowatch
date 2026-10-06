"""
Загрузка каталога фильмов/сериалов из TMDB в нашу таблицу content_items.

Запуск (нужен поднятый Postgres recommendations_db и TMDB_API_KEY в .env):

    cd services/recommendations
    python -m ml.import_catalog                     # popular + top_rated, 25 страниц каждой, movie и tv
    python -m ml.import_catalog --media-type movie  # только фильмы
    python -m ml.import_catalog --pages 50          # больше страниц = больше каталог
    python -m ml.import_catalog --lists popular     # только одна подборка

Против прод-базы на Railway (публичная строка подключения из
Settings -> Networking, драйвер подставится сам):

    python -m ml.import_catalog --database-url "postgresql://user:pass@host:port/recommendations_db"

Идемпотентно: повторный запуск обновляет уже загруженные карточки
(по tmdb_id + media_type), а не плодит дубли — можно спокойно гонять раз в
неделю, чтобы каталог не устаревал.

Что отсеивается ещё на входе (см. TMDBClient.is_wanted): сериалы жанров
News/Talk/Soap/Reality (в tv/popular их половина — Tagesschau, Paradise
Hotel и прочее "что смотрят по телевизору", а не "что посмотреть вместе")
и карточки с числом голосов меньше --min-votes.
"""
import argparse
import asyncio

from app.core.config import settings
from app.database import Base
from app.models.content import ContentItem
from app.services.migrations import ensure_content_columns
from app.services.tmdb_client import LISTS, TMDBClient
from ml.db_url import to_asyncpg_url
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

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


async def main_async(media_types: list[str], pages: int, lists: tuple[str, ...], min_votes: int, database_url: str):
    client = TMDBClient()
    if not client.enabled:
        raise SystemExit(
            "TMDB_API_KEY не задан. Проверь .env в корне репозитория "
            "(и что services/recommendations читает его — см. app/core/config.py)."
        )

    engine = create_async_engine(to_asyncpg_url(database_url))
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_content_columns(conn)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        for media_type in media_types:
            summary = await import_media_type(session, client, media_type, pages, lists=lists, min_votes=min_votes)
            print(f"{media_type}: загружено/обновлено {summary['imported']} карточек, отсеяно {summary['skipped']}")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--media-type", choices=MEDIA_TYPES, default=None, help="Только movie или только tv (по умолчанию — оба)")
    parser.add_argument("--pages", type=int, default=25, help="Сколько страниц каждой подборки листать (20 карточек на странице)")
    parser.add_argument(
        "--lists",
        default=",".join(LISTS),
        help="Подборки TMDB через запятую: popular, top_rated (по умолчанию обе)",
    )
    parser.add_argument("--min-votes", type=int, default=20, help="Не брать карточки с числом голосов меньше N")
    parser.add_argument(
        "--database-url",
        default=settings.database_url,
        help="Строка подключения к recommendations_db (по умолчанию DATABASE_URL из окружения)",
    )
    args = parser.parse_args()

    media_types = [args.media_type] if args.media_type else list(MEDIA_TYPES)
    lists = tuple(name.strip() for name in args.lists.split(",") if name.strip())
    for name in lists:
        if name not in LISTS:
            raise SystemExit(f"Неизвестная подборка {name!r}, доступны: {', '.join(LISTS)}")

    asyncio.run(main_async(media_types, args.pages, lists, args.min_votes, args.database_url))


if __name__ == "__main__":
    main()
