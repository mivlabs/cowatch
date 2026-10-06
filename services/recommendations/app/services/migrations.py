"""
Минимальные миграции схемы без Alembic.

Base.metadata.create_all создаёт недостающие ТАБЛИЦЫ, но не добавляет
новые КОЛОНКИ в уже существующие. На проде content_items создана давно,
поэтому колонки рейтинга (vote_average/vote_count/original_language)
добавляем явно через ADD COLUMN IF NOT EXISTS — идемпотентно, можно
вызывать при каждом старте сервиса.
"""
from sqlalchemy import text

_CONTENT_COLUMNS = (
    "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS vote_average DOUBLE PRECISION DEFAULT 0.0",
    "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0",
    "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS original_language VARCHAR(10)",
)


async def ensure_content_columns(conn) -> None:
    for statement in _CONTENT_COLUMNS:
        await conn.execute(text(statement))
