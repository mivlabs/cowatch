"""Consumer cowatch.events для бота: своя durable-очередь telegram.notifications
на том же topic exchange, что слушает notifications (у каждого потребителя
своя очередь, иначе события делились бы между ними)."""
import asyncio
import json
import logging
from collections.abc import Awaitable, Callable

import aio_pika

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "cowatch.events"
QUEUE_NAME = "telegram.notifications"
ROUTING_KEYS = ["room.joined", "achievement.granted"]

EventHandler = Callable[[dict], Awaitable[None]]


class EventsConsumer:
    def __init__(self, rabbitmq_url: str, handler: EventHandler):
        self._url = rabbitmq_url
        self._handler = handler
        self._connection: aio_pika.RobustConnection | None = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="telegram-events-consumer")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
        if self._connection is not None and not self._connection.is_closed:
            await self._connection.close()

    async def _run(self) -> None:
        self._connection = await aio_pika.connect_robust(self._url)
        channel = await self._connection.channel()
        await channel.set_qos(prefetch_count=10)
        exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        for routing_key in ROUTING_KEYS:
            await queue.bind(exchange, routing_key=routing_key)
        logger.info("telegram_bot: слушаю %s (%s)", QUEUE_NAME, ", ".join(ROUTING_KEYS))
        await queue.consume(self._on_message)

    async def _on_message(self, message: aio_pika.abc.AbstractIncomingMessage) -> None:
        async with message.process():
            try:
                event = json.loads(message.body)
            except json.JSONDecodeError:
                logger.error("Событие не JSON, отбрасываю: %r", message.body[:200])
                return
            try:
                await self._handler(event)
            except Exception:
                logger.exception("Ошибка обработки события %s", event.get("event_type"))
