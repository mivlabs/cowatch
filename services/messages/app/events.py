"""Публикация доменных событий CoWatch в RabbitMQ.

Формат сообщения одинаковый для всех сервисов-издателей (rooms, messages):
{event_type, user_id, payload, occurred_at}. Exchange "cowatch.events" —
topic, routing key = event_type. Общего пакета между сервисами в этом
монорепо нет (каждый сервис — самостоятельное приложение в своём
контейнере), поэтому модуль сознательно продублирован в rooms и messages
вместо того, чтобы городить псевдо-shared-пакет с относительными импортами
через границы сервисов.

Публикация никогда не должна ронять запрос, к которому она привязана
(создание комнаты, отправка сообщения) — поэтому publish_event сама
логирует и глотает любые ошибки соединения с RabbitMQ.
"""
import json
import logging
import os
from datetime import datetime, timezone

import aio_pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
EXCHANGE_NAME = "cowatch.events"

_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def _get_exchange() -> aio_pika.abc.AbstractExchange:
    global _connection, _channel, _exchange
    if _exchange is not None and _connection is not None and not _connection.is_closed:
        return _exchange

    _connection = await aio_pika.connect_robust(RABBITMQ_URL)
    _channel = await _connection.channel()
    _exchange = await _channel.declare_exchange(
        EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True
    )
    return _exchange


async def publish_event(event_type: str, user_id: int, payload: dict) -> None:
    """Публикует событие достижения в cowatch.events с routing key = event_type."""
    message = {
        "event_type": event_type,
        "user_id": user_id,
        "payload": payload,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        exchange = await _get_exchange()
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
    global _connection
    if _connection is not None and not _connection.is_closed:
        await _connection.close()
