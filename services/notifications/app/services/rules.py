"""Правила ачивок первой итерации: по каждому входящему событию решает,
какой счётчик подвинуть и какую ачивку выдать через auth_client.

Дубликаты событий (redelivery из RabbitMQ после сбоя до ack) могут завысить
счётчики на единицы — для порогов вроде "100 сообщений"/"10 часов" это
не критично, а сама выдача ачивки в auth идемпотентна (grant_achievement
проверяет UserAchievement перед вставкой), так что дублирующийся вызов
grant просто no-op. Осознанно не делаем строгую дедупликацию по event_id
ради простоты — см. README/тесты."""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import auth_client
from app.services.counters import increment

logger = logging.getLogger(__name__)

MARATHON_SECONDS_THRESHOLD = 10 * 60 * 60  # 10 часов
CHATTERBOX_MESSAGE_THRESHOLD = 100
SOCIAL_ROOMS_THRESHOLD = 5


async def handle_event(db: AsyncSession, event_type: str, user_id: int, payload: dict) -> None:
    handler = _HANDLERS.get(event_type)
    if handler is None:
        logger.warning("Нет обработчика для события %s", event_type)
        return
    await handler(db, user_id, payload)


async def _handle_room_created(db: AsyncSession, user_id: int, payload: dict) -> None:
    await auth_client.grant_achievement(user_id, "Хозяин вечеринки")


async def _handle_room_joined(db: AsyncSession, user_id: int, payload: dict) -> None:
    joined_count = await increment(db, user_id, "rooms_joined")
    if joined_count >= SOCIAL_ROOMS_THRESHOLD:
        await auth_client.grant_achievement(user_id, "Душа компании")

    participants_count = payload.get("participants_count")
    max_participants = payload.get("max_participants")
    host_id = payload.get("host_id")
    if host_id and participants_count is not None and max_participants is not None:
        if participants_count >= max_participants:
            await auth_client.grant_achievement(host_id, "Полный кинозал")


async def _handle_message_sent(db: AsyncSession, user_id: int, payload: dict) -> None:
    sent_count = await increment(db, user_id, "messages_sent")
    if sent_count >= CHATTERBOX_MESSAGE_THRESHOLD:
        await auth_client.grant_achievement(user_id, "Болтун")


async def _handle_video_watch_completed(db: AsyncSession, user_id: int, payload: dict) -> None:
    duration_seconds = float(payload.get("duration_seconds") or 0)
    if duration_seconds <= 0:
        return

    await auth_client.record_watch_history(
        user_id,
        payload.get("content_title") or "Без названия",
        payload.get("room_code") or "",
        duration_seconds,
    )

    completed_count = await increment(db, user_id, "watch_completed")
    if completed_count >= 1:
        await auth_client.grant_achievement(user_id, "Первый киносеанс")

    total_seconds = await increment(db, user_id, "watch_seconds_total", by=round(duration_seconds))
    if total_seconds >= MARATHON_SECONDS_THRESHOLD:
        await auth_client.grant_achievement(user_id, "Марафонец")


_HANDLERS = {
    "room.created": _handle_room_created,
    "room.joined": _handle_room_joined,
    "message.sent": _handle_message_sent,
    "video.watch_completed": _handle_video_watch_completed,
}
