"""Consumer очереди cowatch.events — считает достижения по событиям из
rooms/messages, слушая topic exchange "cowatch.events" (см. events.py в
rooms/messages для формата сообщения и exchange). Раньше RABBITMQ_URL был
объявлен в docker-compose для notifications, но ничего его не читало —
main.py/database.py были пустыми файлами."""
import asyncio
import json
import logging
import os

import aio_pika

from app.database import async_session
from app.services.rules import handle_event

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
EXCHANGE_NAME = "cowatch.events"
QUEUE_NAME = "notifications.achievements"
ROUTING_KEYS = ["room.created", "room.joined", "message.sent", "video.watch_completed"]

_connection: aio_pika.RobustConnection | None = None
_consume_task: asyncio.Task | None = None


async def _on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            body = json.loads(message.body)
        except json.JSONDecodeError:
            logger.error("Событие не является JSON, отбрасываю: %r", message.body)
            return

        event_type = body.get("event_type")
        user_id = body.get("user_id")
        payload = body.get("payload") or {}

        try:
            async with async_session() as db:
                await handle_event(db, event_type, user_id, payload)
        except Exception:
            logger.exception("Ошибка обработки события %s для user_id=%s", event_type, user_id)


async def _consume_forever() -> None:
    global _connection
    _connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await _connection.channel()
    await channel.set_qos(prefetch_count=10)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True
    )
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    for routing_key in ROUTING_KEYS:
        await queue.bind(exchange, routing_key=routing_key)

    logger.info("notifications: слушаю %s (routing keys: %s)", QUEUE_NAME, ROUTING_KEYS)
    await queue.consume(_on_message)


async def start() -> None:
    global _consume_task
    _consume_task = asyncio.create_task(_consume_forever())


async def stop() -> None:
    if _consume_task is not None:
        _consume_task.cancel()
    if _connection is not None and not _connection.is_closed:
        await _connection.close()
