from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramForbiddenError
from aiogram.methods import SendMessage
from app.handlers import inline
from app.services.notifier import Notifier

from .conftest import BOT_USERNAME


def _query(text: str):
    return SimpleNamespace(query=text, answer=AsyncMock(), from_user=SimpleNamespace(id=1))


@pytest.mark.asyncio
async def test_inline_empty_query_gives_hint_and_create_button(settings, api):
    query = _query("")
    await inline.inline_invite(query, api, settings, BOT_USERNAME)
    results = query.answer.call_args.args[0]
    assert results[0].title == "Введи код комнаты"
    assert "@cowatch_test_bot ABC234" in results[0].description
    assert query.answer.call_args.kwargs["button"].web_app.url == "https://cowatch.fun/tg"


@pytest.mark.asyncio
async def test_inline_room_code_builds_invite(settings, api):
    query = _query("abc234")
    await inline.inline_invite(query, api, settings, BOT_USERNAME)
    [result] = query.answer.call_args.args[0]
    assert result.title == "Пригласить в «Вечер кино»"
    assert result.description == "Код ABC234 · в зале 2 из 10"
    assert "ABC234" in result.input_message_content.message_text
    assert "https://t.me/cowatch_test_bot?startapp=ABC234" in result.input_message_content.message_text
    [[button]] = result.reply_markup.inline_keyboard
    assert button.url == "https://t.me/cowatch_test_bot?startapp=ABC234"


@pytest.mark.asyncio
async def test_inline_unknown_room(settings, api):
    query = _query("ZZZ999")
    await inline.inline_invite(query, api, settings, BOT_USERNAME)
    [result] = query.answer.call_args.args[0]
    assert result.title == "Комнаты ZZZ999 нет"


def _event(event_type: str, user_id: int, payload: dict) -> dict:
    return {"event_type": event_type, "user_id": user_id, "payload": payload, "occurred_at": "2026-10-06T00:00:00+00:00"}


@pytest.mark.asyncio
async def test_room_joined_notifies_host_in_telegram(settings, api):
    bot = SimpleNamespace(send_message=AsyncMock())
    notifier = Notifier(bot, api, settings, BOT_USERNAME)

    await notifier.handle_event(
        _event("room.joined", 8, {"room_code": "ABC234", "host_id": 7, "participants_count": 3, "max_participants": 10})
    )

    kwargs = bot.send_message.call_args.kwargs
    assert kwargs["chat_id"] == 777000111
    assert "petya" in kwargs["text"]
    assert "Вечер кино" in kwargs["text"]
    assert "3 зрителя" in kwargs["text"]
    assert kwargs["reply_markup"].inline_keyboard[0][0].web_app.url == "https://cowatch.fun/tg/room/ABC234"


@pytest.mark.asyncio
async def test_room_joined_skips_hosts_without_telegram_and_self_joins(settings, api):
    bot = SimpleNamespace(send_message=AsyncMock())
    notifier = Notifier(bot, api, settings, BOT_USERNAME)

    await notifier.handle_event(_event("room.joined", 8, {"room_code": "ABC234", "host_id": 42}))  # хост с сайта
    await notifier.handle_event(_event("room.joined", 7, {"room_code": "ABC234", "host_id": 7}))  # сам к себе
    await notifier.handle_event(_event("room.created", 7, {"room_code": "ABC234"}))  # не наше событие

    bot.send_message.assert_not_called()


@pytest.mark.asyncio
async def test_achievement_granted_notifies_user(settings, api):
    bot = SimpleNamespace(send_message=AsyncMock())
    notifier = Notifier(bot, api, settings, BOT_USERNAME)

    await notifier.handle_event(
        _event("achievement.granted", 7, {"code": "first_room", "title": "Хозяин вечеринки", "icon": "🏠"})
    )

    kwargs = bot.send_message.call_args.kwargs
    assert kwargs["chat_id"] == 777000111
    assert "🏠" in kwargs["text"]
    assert "Хозяин вечеринки" in kwargs["text"]
    assert kwargs["reply_markup"].inline_keyboard[0][0].web_app.url == "https://cowatch.fun/tg/profile"


@pytest.mark.asyncio
async def test_blocked_bot_does_not_raise(settings, api):
    bot = SimpleNamespace(
        send_message=AsyncMock(
            side_effect=TelegramForbiddenError(method=SendMessage(chat_id=1, text="x"), message="bot was blocked by the user")
        )
    )
    notifier = Notifier(bot, api, settings, BOT_USERNAME)
    await notifier.handle_event(_event("achievement.granted", 7, {"code": "first_room", "title": "Хозяин вечеринки"}))
