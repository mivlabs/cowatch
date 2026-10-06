"""Публикация событий notifications в RabbitMQ (cowatch.events).

notifications — в первую очередь потребитель событий, но одно событие он
производит сам: achievement.granted, когда auth подтвердил, что наклейка
выдана впервые. Его слушает Telegram-бот (services/telegram_bot) и пишет
человеку в личку. Формат сообщения тот же, что у rooms/messages
({event_type, user_id, payload, occurred_at}, exchange "cowatch.events",
routing key = event_type) — см. docstring в services/rooms/app/events.py о
том, почему модуль продублирован, а не вынесен в общий пакет.

Публикация не должна ломать обработку входящего события: ошибки соединения
логируются и глотаются, а после неудачной попытки соединения следующая
делается не раньше, чем через RETRY_AFTER_SECONDS — иначе каждый grant
ждал бы таймаут подключения к недоступному брокеру.
"""
import json
import logging
import os
import time
from datetime import datetime, timezone

import aio_pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
EXCHANGE_NAME = "cowatch.events"
CONNECT_TIMEOUT_SECONDS = 5
RETRY_AFTER_SECONDS = 30

_connection: aio_pika.RobustConnection | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None
_next_attempt_at = 0.0


async def _get_exchange() -> aio_pika.abc.AbstractExchange | None:
    global _connection, _exchange, _next_attempt_at
    if _exchange is not None and _connection is not None and not _connection.is_closed:
        return _exchange
    if time.monotonic() < _next_attempt_at:
        return None
    try:
        _connection = await aio_pika.connect_robust(RABBITMQ_URL, timeout=CONNECT_TIMEOUT_SECONDS)
        channel = await _connection.channel()
        _exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
        return _exchange
    except Exception:
        _next_attempt_at = time.monotonic() + RETRY_AFTER_SECONDS
        _connection = None
        _exchange = None
        raise


async def publish_event(event_type: str, user_id: int, payload: dict) -> None:
    message = {
        "event_type": event_type,
        "user_id": user_id,
        "payload": payload,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        exchange = await _get_exchange()
        if exchange is None:
            logger.warning("RabbitMQ недоступен, событие %s для user_id=%s пропущено", event_type, user_id)
            return
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode("utf-8"),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=event_type,
        )
    except Exception:
        logger.exception("Не удалось опубликовать событие %s для user_id=%s", event_type, user_id)


async def close_connection() -> None:
    global _connection, _exchange
    if _connection is not None and not _connection.is_closed:
        await _connection.close()
    _connection = None
    _exchange = None
