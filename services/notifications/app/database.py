import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/notifications_db",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
)

async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

from app.models.counters import UserCounter  # noqa: E402


async def get_db():
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
