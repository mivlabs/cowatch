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

То же самое можно сделать изнутри сервиса, без публичного адреса базы:
POST /admin/import-catalog (нужен TMDB_API_KEY в окружении сервиса).

Идемпотентно: повторный запуск обновляет уже загруженные карточки
(по tmdb_id + media_type), а не плодит дубли — можно спокойно гонять раз в
неделю, чтобы каталог не устаревал. Что отсеивается — см.
app/services/catalog_import.py.
"""
import argparse
import asyncio

from app.core.config import settings
from app.database import Base
from app.services.catalog_import import MEDIA_TYPES, import_catalog
from app.services.migrations import ensure_content_columns
from app.services.tmdb_client import LISTS, TMDBClient
from ml.db_url import to_asyncpg_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


async def main_async(media_types: tuple[str, ...], pages: int, lists: tuple[str, ...], min_votes: int, database_url: str):
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
        summary = await import_catalog(session, client, media_types, pages=pages, lists=lists, min_votes=min_votes)
        for media_type, counts in summary.items():
            print(f"{media_type}: загружено/обновлено {counts['imported']} карточек, отсеяно {counts['skipped']}")

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

    media_types = (args.media_type,) if args.media_type else MEDIA_TYPES
    lists = tuple(name.strip() for name in args.lists.split(",") if name.strip())
    for name in lists:
        if name not in LISTS:
            raise SystemExit(f"Неизвестная подборка {name!r}, доступны: {', '.join(LISTS)}")

    asyncio.run(main_async(media_types, args.pages, lists, args.min_votes, args.database_url))


if __name__ == "__main__":
    main()
