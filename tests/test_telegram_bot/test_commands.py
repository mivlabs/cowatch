"""Команды бота против фейкового API. Message заменён объектом с AsyncMock
answer(): проверяем, что бот говорит и какие кнопки показывает."""
import pytest
from aiogram.filters import CommandObject
from app.handlers import commands

from .conftest import BOT_USERNAME, make_message


def _command(name: str, args: str | None = None) -> CommandObject:
    return CommandObject(prefix="/", command=name, args=args)


def _buttons(markup) -> list:
    return [button for row in markup.inline_keyboard for button in row]


@pytest.mark.asyncio
async def test_start_shows_welcome_with_web_app_button(settings):
    message = make_message("/start")
    await commands.start(message, settings)

    text, kwargs = message.answer.call_args.args[0], message.answer.call_args.kwargs
    assert "Маша" in text
    [button] = _buttons(kwargs["reply_markup"])
    assert button.web_app.url == "https://cowatch.fun/tg"


@pytest.mark.asyncio
async def test_start_with_room_code_shows_room_card(settings, api):
    message = make_message("/start ABC234")
    await commands.start_with_payload(message, _command("start", "ABC234"), api, settings, BOT_USERNAME)

    text = message.answer.call_args.args[0]
    assert "Вечер кино" in text
    assert "ABC234" in text
    buttons = _buttons(message.answer.call_args.kwargs["reply_markup"])
    assert buttons[0].web_app.url == "https://cowatch.fun/tg/room/ABC234"
    assert buttons[2].copy_text.text == "ABC234"
    assert "t.me%2Fcowatch_test_bot%3Fstartapp%3DABC234" in buttons[1].url


@pytest.mark.asyncio
async def test_start_with_unknown_payload_falls_back_to_welcome(settings, api):
    message = make_message("/start promo")
    await commands.start_with_payload(message, _command("start", "promo"), api, settings, BOT_USERNAME)
    assert "Привет" in message.answer.call_args.args[0]


@pytest.mark.asyncio
async def test_new_creates_room_for_the_sender(settings, api):
    message = make_message("/new Пятничный ужас")
    await commands.new_room(message, _command("new", "Пятничный ужас"), api, settings, BOT_USERNAME)

    assert api.token_requests[0].telegram_id == 777000111
    assert api.created == [{"token": "token-for-777000111", "title": "Пятничный ужас"}]
    text = message.answer.call_args.args[0]
    assert "Комната готова" in text
    assert "NEW777" in text


@pytest.mark.asyncio
async def test_new_without_title_uses_sender_name(settings, api):
    message = make_message("/new")
    await commands.new_room(message, _command("new", None), api, settings, BOT_USERNAME)
    assert api.created[0]["title"] == "Вечер с Маша"


@pytest.mark.asyncio
async def test_new_in_group_uses_links_instead_of_web_app(settings, api):
    message = make_message("/new", chat_type="supergroup")
    await commands.new_room(message, _command("new", None), api, settings, BOT_USERNAME)
    buttons = _buttons(message.answer.call_args.kwargs["reply_markup"])
    assert buttons[0].web_app is None
    assert buttons[0].url == "https://t.me/cowatch_test_bot?startapp=NEW777"


@pytest.mark.asyncio
async def test_new_reports_api_failure_gently(settings, api):
    api.fail = True
    message = make_message("/new")
    await commands.new_room(message, _command("new", None), api, settings, BOT_USERNAME)
    assert "не отвечает" in message.answer.call_args.args[0]


@pytest.mark.asyncio
async def test_join_without_code_asks_for_it(settings, api):
    message = make_message("/join")
    await commands.join_room(message, _command("join", None), api, settings, BOT_USERNAME)
    assert "Пришли код" in message.answer.call_args.args[0]


@pytest.mark.asyncio
async def test_join_unknown_room(settings, api):
    message = make_message("/join ZZZ999")
    await commands.join_room(message, _command("join", "ZZZ999"), api, settings, BOT_USERNAME)
    assert "нет" in message.answer.call_args.args[0]
    assert "ZZZ999" in message.answer.call_args.args[0]


@pytest.mark.asyncio
async def test_free_text_with_link_opens_room(settings, api):
    message = make_message("смотри https://cowatch.fun/room/ABC234")
    await commands.free_text(message, api, settings, BOT_USERNAME)
    assert "Вечер кино" in message.answer.call_args.args[0]


@pytest.mark.asyncio
async def test_free_text_without_code_hints(settings, api):
    message = make_message("привет")
    await commands.free_text(message, api, settings, BOT_USERNAME)
    assert "/new" in message.answer.call_args.args[0]


@pytest.mark.asyncio
async def test_profile_summarises_stickers(settings, api):
    message = make_message("/profile")
    await commands.profile_command(message, api, settings, BOT_USERNAME)
    text = message.answer.call_args.args[0]
    assert "masha" in text
    assert "3 фильма" in text
    assert "5,5 ч" in text
    assert "2 из 3" in text
    assert "Хозяин вечеринки" in text
    [button] = _buttons(message.answer.call_args.kwargs["reply_markup"])
    assert button.web_app.url == "https://cowatch.fun/tg/profile"
