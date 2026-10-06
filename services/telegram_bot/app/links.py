"""Коды комнат и ссылки Telegram — чистые функции без сети.

Код комнаты — 6 символов из алфавита rooms (без похожих O/0 и I/1, см.
services/rooms/app/models/room.py). Люди присылают его как угодно: строчными,
с решёткой, ссылкой на сайт или на Mini App, внутри фразы — normalize_room_code
достаёт код из всего этого.
"""
import re
from urllib.parse import quote

ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ROOM_CODE_LENGTH = 6
_CODE_RE = re.compile(r"(?<![A-Z0-9])([A-HJ-NP-Z2-9]{6})(?![A-Z0-9])")
_START_PARAM_PREFIXES = ("room_", "room-", "room")


def normalize_room_code(raw: str | None) -> str | None:
    """'abc123', '#ABC123', 'cowatch.fun/room/ABC123', 't.me/bot?startapp=ABC123',
    'зайди в ABC123' -> 'ABC123'; без кода -> None."""
    if not raw:
        return None
    text = raw.strip().upper()
    bare = text.lstrip("#").strip()
    if len(bare) == ROOM_CODE_LENGTH and all(ch in ROOM_CODE_ALPHABET for ch in bare):
        return bare
    matches = _CODE_RE.findall(text)
    return matches[-1] if matches else None


def parse_start_param(param: str | None) -> str | None:
    """Полезная нагрузка deep link (/start ABC123, startapp=room_ABC123) -> код комнаты."""
    if not param:
        return None
    value = param.strip()
    lowered = value.lower()
    for prefix in _START_PARAM_PREFIXES:
        if lowered.startswith(prefix) and len(value) > len(prefix):
            value = value[len(prefix):]
            break
    return normalize_room_code(value)


def mini_app_link(bot_username: str, start_param: str | None = None) -> str:
    """Ссылка на основное Mini App бота: t.me/<bot>?startapp=<код>."""
    base = f"https://t.me/{bot_username.lstrip('@')}"
    return f"{base}?startapp={start_param}" if start_param else base


def bot_start_link(bot_username: str, payload: str) -> str:
    """Ссылка на /start с полезной нагрузкой — для чатов, где web_app-кнопки недоступны."""
    return f"https://t.me/{bot_username.lstrip('@')}?start={payload}"


def share_link(url: str, text: str) -> str:
    """Системное окно Telegram «отправить ссылку»: t.me/share/url?url=...&text=..."""
    return f"https://t.me/share/url?url={quote(url, safe='')}&text={quote(text, safe='')}"


def room_site_link(site_url: str, code: str) -> str:
    return f"{site_url.rstrip('/')}/room/{code}"
