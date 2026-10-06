"""Правила ачивок: по каждому входящему событию решает, какой счётчик
подвинуть и какую ачивку выдать через auth_client.

Ключи ачивок (first_room, chatterbox, ...) — поле code из
services/auth/app/services/achievement_service.py:SEED_ACHIEVEMENTS; тут
живут только пороги и логика событий.

Дубликаты событий (redelivery из RabbitMQ после сбоя до ack) могут завысить
счётчики на единицы — для порогов вроде "100 сообщений"/"10 часов" это
не критично, а сама выдача ачивки в auth идемпотентна (INSERT ... ON CONFLICT
DO NOTHING), так что дублирующийся вызов grant просто no-op. Осознанно не
делаем строгую дедупликацию по event_id ради простоты — см. README/тесты."""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import auth_client, events
from app.services.counters import increment

logger = logging.getLogger(__name__)

# --- Зал ---
FILM_CLUB_ROOMS_CREATED = 10        # «Киноклуб»
SOCIAL_ROOMS_THRESHOLD = 5          # «Душа компании»
REGULAR_ROOMS_THRESHOLD = 25        # «Завсегдатай»
FULL_HOUSE_PARTICIPANTS = 5         # «Полный кинозал»: зрителей в комнате хоста, включая его
# --- Общение ---
CHATTERBOX_MESSAGE_THRESHOLD = 100  # «Болтун»
COMMENTATOR_MESSAGE_THRESHOLD = 1000  # «Комментатор»
EMOTIONS_REACTIONS_THRESHOLD = 50   # «Эмоции через край»
# --- Просмотр ---
DOUBLE_FEATURE_PER_DAY = 2          # «Двойной сеанс»
ENCORE_SAME_CONTENT = 2             # «На бис»
NIGHT_OWL_HOURS = range(0, 5)       # «Полуночник»: 00:00–04:59 по времени зрителя
MARATHON_SECONDS_THRESHOLD = 10 * 60 * 60   # «Марафонец», 10 часов
CINEPHILE_SECONDS_THRESHOLD = 50 * 60 * 60  # «Киноман», 50 часов


async def grant(user_id: int, achievement_code: str) -> None:
    """Выдаёт наклейку через auth и, если она выдана впервые, публикует
    achievement.granted — Telegram-бот по нему пишет человеку в личку."""
    result = await auth_client.grant_achievement(user_id, achievement_code)
    if not result or not result.get("granted"):
        return
    await events.publish_event("achievement.granted", user_id, {
        "code": result.get("code") or achievement_code,
        "title": result.get("title"),
        "icon": result.get("icon"),
    })


async def handle_event(db: AsyncSession, event_type: str, user_id: int, payload: dict) -> None:
    handler = _HANDLERS.get(event_type)
    if handler is None:
        logger.warning("Нет обработчика для события %s", event_type)
        return
    await handler(db, user_id, payload)


async def _handle_room_created(db: AsyncSession, user_id: int, payload: dict) -> None:
    await grant(user_id, "first_room")

    created_count = await increment(db, user_id, "rooms_created")
    if created_count >= FILM_CLUB_ROOMS_CREATED:
        await grant(user_id, "film_club")


async def _handle_room_joined(db: AsyncSession, user_id: int, payload: dict) -> None:
    joined_count = await increment(db, user_id, "rooms_joined")
    if joined_count >= SOCIAL_ROOMS_THRESHOLD:
        await grant(user_id, "social_butterfly")
    if joined_count >= REGULAR_ROOMS_THRESHOLD:
        await grant(user_id, "regular")

    # Хозяину комнаты: первый гость по коду и полный зал. room.joined
    # публикуется только для гостей (хост в join_room не ходит), поэтому
    # host_id != user_id всегда, но проверка дешёвая и защищает от будущих
    # изменений в rooms.
    host_id = payload.get("host_id")
    participants_count = payload.get("participants_count")
    if host_id and host_id != user_id:
        await grant(host_id, "hospitable")
        if participants_count is not None and participants_count >= FULL_HOUSE_PARTICIPANTS:
            await grant(host_id, "full_house")


async def _handle_message_sent(db: AsyncSession, user_id: int, payload: dict) -> None:
    sent_count = await increment(db, user_id, "messages_sent")
    if sent_count >= CHATTERBOX_MESSAGE_THRESHOLD:
        await grant(user_id, "chatterbox")
    if sent_count >= COMMENTATOR_MESSAGE_THRESHOLD:
        await grant(user_id, "commentator")


async def _handle_reaction_sent(db: AsyncSession, user_id: int, payload: dict) -> None:
    reactions_count = await increment(db, user_id, "reactions_sent")
    if reactions_count >= EMOTIONS_REACTIONS_THRESHOLD:
        await grant(user_id, "emotions")


def _content_key(payload: dict) -> str | None:
    """Чем считать «тот же фильм» для «На бис»: id из каталога, иначе ссылка."""
    content_id = payload.get("content_id")
    if content_id:
        return f"id:{content_id}"
    content_url = (payload.get("content_url") or "").strip()
    if content_url:
        return f"url:{content_url[:400]}"
    return None


async def _handle_video_watch_completed(db: AsyncSession, user_id: int, payload: dict) -> None:
    duration_seconds = float(payload.get("duration_seconds") or 0)
    if duration_seconds <= 0:
        return

    await auth_client.record_watch_history(
        user_id,
        payload.get("content_title") or "Без названия",
        payload.get("content_url") or payload.get("room_code") or "",
        duration_seconds,
    )

    total_seconds = await increment(db, user_id, "watch_seconds_total", by=round(duration_seconds))
    if total_seconds >= MARATHON_SECONDS_THRESHOLD:
        await grant(user_id, "marathon")
    if total_seconds >= CINEPHILE_SECONDS_THRESHOLD:
        await grant(user_id, "cinephile")

    # Всё ниже — только за просмотр до конца (video_end от плеера зрителя).
    # Выход из комнаты посреди фильма даёт часы и запись в истории, но не
    # «досмотрел».
    if not payload.get("completed"):
        return

    completed_count = await increment(db, user_id, "watch_completed")
    if completed_count >= 1:
        await grant(user_id, "first_session")

    local_hour = payload.get("local_hour")
    if isinstance(local_hour, int) and local_hour in NIGHT_OWL_HOURS:
        await grant(user_id, "night_owl")

    local_date = payload.get("local_date")
    if isinstance(local_date, str) and local_date:
        day_count = await increment(db, user_id, f"watch_day:{local_date[:10]}")
        if day_count >= DOUBLE_FEATURE_PER_DAY:
            await grant(user_id, "double_feature")

    content_key = _content_key(payload)
    if content_key is not None:
        content_count = await increment(db, user_id, f"watch_content:{content_key}")
        if content_count >= ENCORE_SAME_CONTENT:
            await grant(user_id, "encore")


_HANDLERS = {
    "room.created": _handle_room_created,
    "room.joined": _handle_room_joined,
    "message.sent": _handle_message_sent,
    "reaction.sent": _handle_reaction_sent,
    "video.watch_completed": _handle_video_watch_completed,
}
