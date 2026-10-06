"""Команды бота в личке и в группах.

api, settings и bot_username приходят из workflow_data диспетчера
(см. main.py) — aiogram подставляет их в хендлеры по имени аргумента.
"""
import logging

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import Message

from app import keyboards, texts
from app.config import Settings
from app.links import normalize_room_code, parse_start_param
from app.services.cowatch import CowatchApi, CowatchApiError, RoomNotFound, TelegramIdentity

logger = logging.getLogger(__name__)

router = Router(name="commands")


def _is_private(message: Message) -> bool:
    return message.chat.type == "private"


async def send_room_card(
    message: Message,
    api: CowatchApi,
    settings: Settings,
    bot_username: str,
    code: str,
    *,
    created: bool = False,
    room: dict | None = None,
) -> None:
    if room is None:
        try:
            room = await api.get_room(code)
        except RoomNotFound:
            await message.answer(texts.room_not_found(code))
            return
        except CowatchApiError:
            await message.answer(texts.api_error())
            return
    await message.answer(
        texts.room_card(room, created=created),
        reply_markup=keyboards.room_keyboard(settings, bot_username, room, private_chat=_is_private(message)),
    )


@router.message(CommandStart(deep_link=True))
async def start_with_payload(
    message: Message, command: CommandObject, api: CowatchApi, settings: Settings, bot_username: str
) -> None:
    """t.me/<bot>?start=ABC123 — человек пришёл по приглашению, сразу показываем комнату."""
    code = parse_start_param(command.args)
    if code:
        await send_room_card(message, api, settings, bot_username, code)
    else:
        await start(message, settings, bot_username)


@router.message(CommandStart())
async def start(message: Message, settings: Settings, bot_username: str) -> None:
    first_name = message.from_user.first_name if message.from_user else None
    await message.answer(
        texts.welcome(first_name, bot_username), reply_markup=keyboards.open_app_keyboard(settings)
    )


@router.message(Command("help"))
async def help_command(message: Message, bot_username: str) -> None:
    await message.answer(texts.help_text(bot_username))


@router.message(Command("app"))
async def app_command(message: Message, settings: Settings, bot_username: str) -> None:
    if _is_private(message):
        await message.answer("Открываю CoWatch:", reply_markup=keyboards.open_app_keyboard(settings))
    else:
        await message.answer(
            "Приложение открывается в личке с ботом:",
            reply_markup=keyboards.profile_keyboard(settings, bot_username, private_chat=False),
        )


@router.message(Command("new"))
async def new_room(
    message: Message, command: CommandObject, api: CowatchApi, settings: Settings, bot_username: str
) -> None:
    """Создаёт комнату от имени автора сообщения: токен для него выдаёт auth по telegram_id."""
    if message.from_user is None:
        return
    title = (command.args or "").strip() or texts.default_room_title(message.from_user.first_name)
    try:
        token = await api.token_for(TelegramIdentity.from_user(message.from_user))
        room = await api.create_room(token["access_token"], title[:100])
    except (CowatchApiError, KeyError):
        await message.answer(texts.api_error())
        return
    await send_room_card(message, api, settings, bot_username, room["code"], created=True, room=room)


@router.message(Command("join", "room"))
async def join_room(
    message: Message, command: CommandObject, api: CowatchApi, settings: Settings, bot_username: str
) -> None:
    code = normalize_room_code(command.args)
    if not code:
        await message.answer(texts.ask_for_code())
        return
    await send_room_card(message, api, settings, bot_username, code)


@router.message(Command("profile"))
async def profile_command(message: Message, api: CowatchApi, settings: Settings, bot_username: str) -> None:
    if message.from_user is None:
        return
    try:
        token = await api.token_for(TelegramIdentity.from_user(message.from_user))
        profile = await api.profile(token["user"]["id"])
    except (CowatchApiError, KeyError):
        await message.answer(texts.api_error())
        return
    await message.answer(
        texts.profile_summary(profile),
        reply_markup=keyboards.profile_keyboard(settings, bot_username, private_chat=_is_private(message)),
    )


@router.message(F.text, F.chat.type == "private")
async def free_text(message: Message, api: CowatchApi, settings: Settings, bot_username: str) -> None:
    """В личке любой текст с кодом комнаты (или ссылкой на неё) работает как /join."""
    code = normalize_room_code(message.text)
    if code:
        await send_room_card(message, api, settings, bot_username, code)
    else:
        await message.answer(texts.unknown_text_hint())
