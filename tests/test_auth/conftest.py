"""
Каждый сервис в этом монорепо — отдельное Python-приложение с одинаковым
именем корневого пакета (`app`), просто лежащее в своей папке под services/.
Поэтому перед импортом кода сервиса мы:
  1. чистим sys.modules от `app` и `app.*`, оставшихся от другого сервиса
     (актуально, если pytest запускают сразу на весь tests/, а не по одному
     сервису за раз);
  2. подставляем в sys.path именно services/auth, а не services/rooms и т.п.

Всё это выполняется один раз при импорте conftest — сам import `app.main`
делается тоже здесь и передаётся тестам через фикстуру `client`, чтобы
тестовые модули не делали `import app.*` сами и не зависели от порядка
запуска.
"""
import os
import sys
import pathlib

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "auth"

# DATABASE_URL должен быть выставлен ДО импорта app.database — он читает
# переменную окружения на уровне модуля.
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_AUTH_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/auth_test",
    ),
)
os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-prod")

for _mod in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
    del sys.modules[_mod]
if str(SERVICE_ROOT) in sys.path:
    sys.path.remove(str(SERVICE_ROOT))
sys.path.insert(0, str(SERVICE_ROOT))

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def _clean_database():
    """Свежие таблицы на каждый тест — просто и надёжно для такого объёма тестов."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # pytest-asyncio даёт каждому тесту свой event loop, а engine — общий на
    # процесс: без dispose() его пул пытается переиспользовать asyncpg-соединение,
    # открытое в уже закрытом loop прошлого теста ("attached to a different loop").
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
