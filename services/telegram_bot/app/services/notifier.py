"""Превращает события cowatch.events в сообщения людям в Telegram.

room.joined — хосту: кто зашёл в его комнату (публикует rooms при входе
по коду). achievement.granted — получателю наклейки (публикует
notifications, когда auth подтвердил первую выдачу). Пишем только тем, у
кого аккаунт привязан к Telegram, остальных auth в выдаче не вернёт.
"""
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from app import keyboards, texts
from app.config import Settings
from app.services.cowatch import CowatchApi, CowatchApiError

logger = logging.getLogger(__name__)

HANDLED_EVENTS = ("room.joined", "achievement.granted")


class Notifier:
    def __init__(self, bot: Bot, api: CowatchApi, settings: Settings, bot_username: str):
        self._bot = bot
        self._api = api
        self._settings = settings
        self._bot_username = bot_username

    async def handle_event(self, event: dict) -> None:
        event_type = event.get("event_type")
        if event_type == "room.joined":
            await self._room_joined(event)
        elif event_type == "achievement.granted":
            await self._achievement_granted(event)
        else:
            logger.debug("Событие %s боту не интересно", event_type)

    async def _room_joined(self, event: dict) -> None:
        payload = event.get("payload") or {}
        host_id = payload.get("host_id")
        guest_id = event.get("user_id")
        code = str(payload.get("room_code") or "")
        if not host_id or not code or host_id == guest_id:
            return

        links = await self._api.telegram_links([host_id])
        host = links.get(host_id)
        if host is None:
            return  # хост зашёл с сайта, в Telegram ему не написать

        guest_name = "Кто-то"
        if guest_id:
            try:
                guest_name = (await self._api.profile(guest_id)).get("username") or guest_name
            except CowatchApiError:
                pass

        room: dict = {"code": code, "title": None}
        try:
            room = await self._api.get_room(code)
        except CowatchApiError:
            pass

        await self._send(
            host["telegram_id"],
            texts.joined_notification(room.get("title"), code, guest_name, payload.get("participants_count")),
            keyboards.room_keyboard(self._settings, self._bot_username, room, private_chat=True),
        )

    async def _achievement_granted(self, event: dict) -> None:
        payload = event.get("payload") or {}
        user_id = event.get("user_id")
        if not user_id:
            return
        links = await self._api.telegram_links([user_id])
        user = links.get(user_id)
        if user is None:
            return
        await self._send(
            user["telegram_id"],
            texts.achievement_notification(payload.get("title"), payload.get("icon")),
            keyboards.profile_keyboard(self._settings, self._bot_username, private_chat=True),
        )

    async def _send(self, chat_id: int, text: str, reply_markup) -> None:
        try:
            await self._bot.send_message(chat_id=chat_id, text=text, reply_markup=reply_markup)
        except TelegramAPIError as exc:
            # Человек заблокировал бота или ещё не нажимал /start — это не ошибка сервиса.
            logger.info("Не доставлено в чат %s: %s", chat_id, exc)
