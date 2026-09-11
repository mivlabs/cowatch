"""См. tests/test_auth/conftest.py — тот же приём с sys.modules/sys.path
для одноимённого пакета `app` у каждого сервиса.

MODEL_DIR указывает на tmp-папку на каждый тест, чтобы тесты API не
зависели от того, обучена ли где-то реальная модель локально на диске
разработчика (и не оставляли мусор в services/recommendations/models/).
"""
import os
import pathlib
import sys
import tempfile

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "recommendations"

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_RECOMMENDATIONS_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/recommendations_test",
    ),
)
os.environ["MODEL_DIR"] = tempfile.mkdtemp(prefix="cowatch-reco-test-")

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
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
