"""См. tests/test_auth/conftest.py — та же изоляция пакета `app` между сервисами."""
import os
import sys
import pathlib

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "messages"

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_MESSAGES_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/messages_test",
    ),
)

for _mod in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
    del sys.modules[_mod]
if str(SERVICE_ROOT) in sys.path:
    sys.path.remove(str(SERVICE_ROOT))
sys.path.insert(0, str(SERVICE_ROOT))

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def _clean_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sync_app():
    """Для WebSocket-тестов: TestClient умеет websocket_connect, httpx — нет."""
    return app
