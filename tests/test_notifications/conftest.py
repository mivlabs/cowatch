"""notifications — единственный сервис, которому для интеграционного теста
нужно поднять сразу два приложения ('app'-пакета) в одном процессе: auth
(чтобы проверить, что ачивка реально долетела до профиля) и сам notifications
(чтобы гонять настоящий consumer против настоящего RabbitMQ). Обычная схема
из test_auth/test_rooms/test_messages conftest (once per test dir: чистим
sys.modules, подставляем sys.path, импортируем) применяется тут дважды подряд
— импортируем auth, забираем нужные объекты, чистим sys.modules/sys.path,
и только потом импортируем notifications.

RabbitMQ в этих тестах настоящий (см. docker-compose.yml -> rabbitmq), а не
замоканный aio-pika. Обоснование: единственная реальная опасность в этой
системе — разъехавшиеся exchange/routing key/формат сообщения между
publisher (rooms/messages) и consumer (notifications); мок aio-pika прячет
именно этот класс багов, а не ловит его. Реальный HTTP-вызов в auth,
наоборот, замокан (через ASGITransport поверх настоящего FastAPI-приложения
auth, без реального TCP-сервера) — это не часть транспортного контракта,
который мы тут проверяем, и поднимать процесс uvicorn ради одного теста
того не стоит.
"""
import asyncio
import importlib
import json
import os
import pathlib
import sys
from datetime import datetime, timezone

import aio_pika
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
AUTH_ROOT = REPO_ROOT / "services" / "auth"
NOTIFICATIONS_ROOT = REPO_ROOT / "services" / "notifications"

TEST_JWT_SECRET = "test-secret-do-not-use-in-prod"
TEST_INTERNAL_SECRET = "test-internal-secret"

os.environ.setdefault("JWT_SECRET", TEST_JWT_SECRET)
os.environ.setdefault("INTERNAL_API_SECRET", TEST_INTERNAL_SECRET)
os.environ.setdefault(
    "TEST_RABBITMQ_URL", os.environ.get("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
)


def _reset_app_package():
    for mod_name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[mod_name]


def _import_service(service_root: pathlib.Path, database_url: str):
    _reset_app_package()
    if str(service_root) in sys.path:
        sys.path.remove(str(service_root))
    sys.path.insert(0, str(service_root))
    os.environ["DATABASE_URL"] = database_url

    main_module = importlib.import_module("app.main")
    database_module = importlib.import_module("app.database")

    sys.path.remove(str(service_root))
    return main_module, database_module


# --- auth (используется только как ASGI-транспорт для проверки профиля/грантов) ---
os.environ.setdefault(
    "TEST_AUTH_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/auth_test",
)
_auth_main, _auth_database = _import_service(AUTH_ROOT, os.environ["TEST_AUTH_DATABASE_URL"])
auth_app = _auth_main.app
AuthBase = _auth_database.Base
auth_engine = _auth_database.engine
auth_async_session = _auth_database.async_session

# app.main (импортированный выше) тянет app.routers.auth -> app.services.achievement_service
# транзитивно, так что модуль уже лежит в sys.modules — _import_service чистит
# sys.path, но не sys.modules, так что забрать его можно без повторной возни с путями.
seed_achievements = importlib.import_module("app.services.achievement_service").seed_achievements
_reset_app_package()

# --- notifications (реальный consumer, реальный RabbitMQ) ---
os.environ.setdefault(
    "TEST_NOTIFICATIONS_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/notifications_test",
)
os.environ["RABBITMQ_URL"] = os.environ["TEST_RABBITMQ_URL"]
_notif_main, _notif_database = _import_service(
    NOTIFICATIONS_ROOT, os.environ["TEST_NOTIFICATIONS_DATABASE_URL"]
)
notifications_app = _notif_main.app
NotifBase = _notif_database.Base
notif_engine = _notif_database.engine
notif_async_session = _notif_database.async_session

# Как и с achievement_service выше: app.main тянет app.services.consumer
# (-> app.services.rules -> app.services.auth_client) транзитивно.
consumer = importlib.import_module("app.services.consumer")
auth_client = importlib.import_module("app.services.auth_client")
_reset_app_package()


@pytest_asyncio.fixture(autouse=True)
async def _clean_state(monkeypatch):
    async with auth_engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.drop_all)
        await conn.run_sync(AuthBase.metadata.create_all)
    async with auth_async_session() as db:
        await seed_achievements(db)

    async with notif_engine.begin() as conn:
        await conn.run_sync(NotifBase.metadata.drop_all)
        await conn.run_sync(NotifBase.metadata.create_all)

    # Реальный HTTP убираем из уравнения, но не сам факт HTTP-вызова:
    # auth_client всё ещё делает настоящий ASGI-запрос, просто без сокета.
    def _auth_test_client():
        return AsyncClient(transport=ASGITransport(app=auth_app), base_url="http://auth-test")

    monkeypatch.setattr(auth_client, "_make_client", _auth_test_client)

    # Очередь notifications.achievements durable и переживает между тестами.
    # user_id в auth_test начинаются заново с 1 после drop_all/create_all
    # (сброс последовательности) — не почистив очередь, "хвост" из
    # предыдущего теста мог бы прилететь и накрутить счётчики новому
    # пользователю с тем же id в следующем тесте.
    try:
        purge_connection = await aio_pika.connect_robust(os.environ["TEST_RABBITMQ_URL"])
        async with purge_connection:
            purge_channel = await purge_connection.channel()
            purge_queue = await purge_channel.get_queue(consumer.QUEUE_NAME)
            await purge_queue.purge()
    except Exception:
        pass  # Очереди ещё нет (первый запуск тестов) — консьюмер сам её заведёт ниже.

    await consumer.start()
    try:
        yield
    finally:
        await consumer.stop()
        # Даём фоновой задаче consumer'а шанс на cancellation до dispose,
        # иначе asyncpg иногда ругается на использование пула из закрытого loop.
        await asyncio.sleep(0)
        await auth_engine.dispose()
        await notif_engine.dispose()


@pytest_asyncio.fixture
async def auth_client_http():
    transport = ASGITransport(app=auth_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def notifications_client():
    transport = ASGITransport(app=notifications_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def publish_raw_event():
    """Публикует событие в настоящий cowatch.events ровно в том формате, который
    производят rooms/messages (см. их events.py) — без импорта их publish_event,
    чтобы не тащить в тест ещё один сервисный `app`-пакет."""
    connection = await aio_pika.connect_robust(os.environ["TEST_RABBITMQ_URL"])
    channel = await connection.channel()
    exchange = await channel.declare_exchange(
        "cowatch.events", aio_pika.ExchangeType.TOPIC, durable=True
    )

    async def _publish(event_type: str, user_id: int, payload: dict) -> None:
        body = {
            "event_type": event_type,
            "user_id": user_id,
            "payload": payload,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }
        await exchange.publish(
            aio_pika.Message(body=json.dumps(body).encode("utf-8")),
            routing_key=event_type,
        )

    try:
        yield _publish
    finally:
        await connection.close()
