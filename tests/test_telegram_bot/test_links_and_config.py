import pytest
from app.config import ConfigError, load_settings
from app.links import (
    bot_start_link,
    mini_app_link,
    normalize_room_code,
    parse_start_param,
    share_link,
)


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("ABC234", "ABC234"),
        ("abc234", "ABC234"),
        ("  #abc234 ", "ABC234"),
        ("https://cowatch.fun/room/ABC234", "ABC234"),
        ("https://t.me/cowatch_bot?startapp=ABC234", "ABC234"),
        ("зайди в комнату abc234, ждём", "ABC234"),
        ("/join ABC234", "ABC234"),
        ("", None),
        (None, None),
        ("ABC", None),
        ("ABC1234", None),  # семь символов — не код
        ("AB0I23", None),  # 0 и I в алфавите кодов не бывают
        ("просто текст без кода", None),
    ],
)
def test_normalize_room_code(raw, expected):
    assert normalize_room_code(raw) == expected


@pytest.mark.parametrize(
    "param, expected",
    [
        ("ABC234", "ABC234"),
        ("room_ABC234", "ABC234"),
        ("room-abc234", "ABC234"),
        ("", None),
        (None, None),
        ("inline", None),
    ],
)
def test_parse_start_param(param, expected):
    assert parse_start_param(param) == expected


def test_links():
    assert mini_app_link("cowatch_bot") == "https://t.me/cowatch_bot"
    assert mini_app_link("@cowatch_bot", "ABC234") == "https://t.me/cowatch_bot?startapp=ABC234"
    assert bot_start_link("cowatch_bot", "ABC234") == "https://t.me/cowatch_bot?start=ABC234"
    link = share_link("https://t.me/cowatch_bot?startapp=ABC234", "Зову смотреть: Вечер кино")
    assert link.startswith("https://t.me/share/url?url=https%3A%2F%2Ft.me%2Fcowatch_bot%3Fstartapp%3DABC234&text=")
    assert "%D0%97%D0%BE%D0%B2%D1%83" in link  # кириллица закодирована


def test_load_settings_requires_token_and_secret():
    with pytest.raises(ConfigError, match="TELEGRAM_BOT_TOKEN"):
        load_settings({"INTERNAL_API_SECRET": "x" * 20})
    with pytest.raises(ConfigError, match="INTERNAL_API_SECRET"):
        load_settings({"TELEGRAM_BOT_TOKEN": "1:a", "INTERNAL_API_SECRET": "short"})


def test_load_settings_defaults_and_urls():
    settings = load_settings(
        {
            "TELEGRAM_BOT_TOKEN": "1:a",
            "INTERNAL_API_SECRET": "x" * 20,
            "MINI_APP_URL": "https://cowatch.fun/tg/",
            "WEBHOOK_URL": "https://bot.up.railway.app/",
            "PORT": "9000",
        }
    )
    assert settings.app_url("/room/ABC234") == "https://cowatch.fun/tg/room/ABC234"
    assert settings.webhook_endpoint == "https://bot.up.railway.app/telegram/webhook"
    assert settings.port == 9000
    assert settings.rabbitmq_url is None

    polling = load_settings({"TELEGRAM_BOT_TOKEN": "1:a", "INTERNAL_API_SECRET": "x" * 20, "WEBHOOK_URL": ""})
    assert polling.webhook_endpoint is None
