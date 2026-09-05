"""См. tests/test_auth/conftest.py — та же проблема с одинаковым именем
пакета `app` у каждого сервиса и то же решение: чистим sys.modules и
подставляем нужный sys.path перед импортом.

Rooms дополнительно требует Redis (публикация событий комнаты) и Postgres
с UUID-колонкой (Room.id) — это не заводится на sqlite, поэтому тесты
всегда идут против настоящего Postgres.
"""
import os
import sys
import pathlib
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "rooms"

TEST_JWT_SECRET = "test-secret-do-not-use-in-prod"

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_ROOMS_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/rooms_test",
    ),
)
os.environ.setdefault("REDIS_URL", os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/13"))
os.environ.setdefault("JWT_SECRET", TEST_JWT_SECRET)

for _mod in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
    del sys.modules[_mod]
if str(SERVICE_ROOT) in sys.path:
    sys.path.remove(str(SERVICE_ROOT))
sys.path.insert(0, str(SERVICE_ROOT))

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.routers.rooms import redis_client  # noqa: E402
from app.services.room_service import redis_client as room_service_redis_client  # noqa: E402


def make_token(user_id: int, email: str) -> str:
    payload = {
        "sub": email,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=30),
        "type": "access",
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_headers():
    """Фикстура-фабрика: auth_headers(user_id, email) -> {"Authorization": "Bearer ..."}"""

    def _make(user_id: int, email: str = "user@cowatch.fun") -> dict:
        return {"Authorization": f"Bearer {make_token(user_id, email)}"}

    return _make


@pytest_asyncio.fixture(autouse=True)
async def _clean_state():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await redis_client.flushdb()
    yield
    # pytest-asyncio даёт каждому тесту свой event loop, а engine/redis-клиенты —
    # общие на процесс: без закрытия их пулы пытаются переиспользовать соединения,
    # открытые в уже закрытом loop прошлого теста ("attached to a different loop").
    # rooms.py и room_service.py держат каждый свой Redis-клиент (см. коммит про
    # рассинхрон REDIS_URL) — закрывать нужно оба.
    await engine.dispose()
    await redis_client.aclose()
    await room_service_redis_client.aclose()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
