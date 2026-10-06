"""Тесты Telegram-бота. Сеть не нужна: Telegram и сервисы CoWatch заменены
фейками, проверяется логика команд, текстов, ссылок и уведомлений.

Та же схема с пакетом `app`, что у остальных сервисов (см. tests/test_auth/conftest.py).
"""
import os
import pathlib
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "telegram_bot"

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:TEST-TOKEN-NOT-REAL")
os.environ.setdefault("INTERNAL_API_SECRET", "test-internal-secret")

for _mod in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
    del sys.modules[_mod]
if str(SERVICE_ROOT) in sys.path:
    sys.path.remove(str(SERVICE_ROOT))
sys.path.insert(0, str(SERVICE_ROOT))

from app.config import Settings  # noqa: E402
from app.services.cowatch import CowatchApiError, RoomNotFound  # noqa: E402

BOT_USERNAME = "cowatch_test_bot"

ROOM = {
    "id": "11111111-1111-1111-1111-111111111111",
    "code": "ABC234",
    "host_id": 7,
    "title": "Вечер кино",
    "is_private": True,
    "max_participants": 10,
    "current_movie_url": None,
    "current_movie_title": None,
    "content_id": None,
    "current_position": 0,
    "is_playing": False,
    "created_at": "2026-10-06T00:00:00",
    "participants_count": 2,
}


class FakeApi:
    """Подменяет CowatchApi: хранит комнаты в словаре и записывает вызовы."""

    def __init__(self):
        self.rooms = {ROOM["code"]: dict(ROOM)}
        self.links = {7: {"user_id": 7, "telegram_id": 777000111, "username": "masha"}}
        self.profiles = {
            7: {
                "username": "masha",
                "email": None,
                "total_movies": 3,
                "total_hours": 5.5,
                "achievements": [
                    {"code": "first_step", "title": "Первый шаг", "icon": "🎬", "unlocked_at": "2026-10-01T00:00:00"},
                    {"code": "first_room", "title": "Хозяин вечеринки", "icon": "🏠", "unlocked_at": "2026-10-02T00:00:00"},
                    {"code": "marathon", "title": "Марафонец", "icon": "🏃", "unlocked_at": None},
                ],
                "history": [],
            },
            8: {"username": "petya", "email": None, "total_movies": 0, "total_hours": 0, "achievements": [], "history": []},
        }
        self.created: list[dict] = []
        self.token_requests: list = []
        self.fail = False

    async def token_for(self, identity):
        if self.fail:
            raise CowatchApiError("down")
        self.token_requests.append(identity)
        return {"access_token": f"token-for-{identity.telegram_id}", "user": {"id": 7, "username": "masha"}}

    async def create_room(self, access_token, title, *, max_participants=10, is_private=True):
        if self.fail:
            raise CowatchApiError("down")
        room = {**ROOM, "code": "NEW777", "title": title, "participants_count": 1}
        self.rooms[room["code"]] = room
        self.created.append({"token": access_token, "title": title})
        return room

    async def get_room(self, code):
        if self.fail:
            raise CowatchApiError("down")
        if code not in self.rooms:
            raise RoomNotFound(code)
        return self.rooms[code]

    async def profile(self, user_id):
        if self.fail or user_id not in self.profiles:
            raise CowatchApiError("down")
        return self.profiles[user_id]

    async def telegram_links(self, user_ids):
        return {uid: self.links[uid] for uid in user_ids if uid in self.links}


def make_message(text: str, *, chat_type: str = "private", first_name: str = "Маша", user_id: int = 777000111):
    user = SimpleNamespace(id=user_id, first_name=first_name, last_name=None, username="masha", is_bot=False)
    message = SimpleNamespace(
        text=text,
        chat=SimpleNamespace(id=user_id if chat_type == "private" else -100500, type=chat_type),
        from_user=user,
        answer=AsyncMock(),
    )
    return message


@pytest.fixture
def settings() -> Settings:
    return Settings(
        bot_token="123456:TEST-TOKEN-NOT-REAL",
        internal_api_secret="test-internal-secret",
        auth_service_url="http://auth.test",
        rooms_service_url="http://rooms.test",
        mini_app_url="https://cowatch.fun/tg",
        site_url="https://cowatch.fun",
    )


@pytest.fixture
def api() -> FakeApi:
    return FakeApi()
