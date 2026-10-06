"""HTTP-клиент к сервисам CoWatch.

Бот не трогает базы напрямую: токен для пользователя Telegram берёт у auth
через внутренний эндпоинт (общий секрет), комнаты создаёт и читает через
публичный API rooms с этим токеном — ровно как сайт.
"""
import logging
from dataclasses import dataclass

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


class CowatchApiError(Exception):
    """Сервис не ответил или ответил ошибкой."""


class RoomNotFound(CowatchApiError):
    pass


@dataclass(frozen=True)
class TelegramIdentity:
    telegram_id: int
    first_name: str = ""
    last_name: str | None = None
    username: str | None = None

    @classmethod
    def from_user(cls, user) -> "TelegramIdentity":
        """Из aiogram.types.User (или любого объекта с теми же полями)."""
        return cls(
            telegram_id=user.id,
            first_name=user.first_name or "",
            last_name=getattr(user, "last_name", None),
            username=getattr(user, "username", None),
        )


class CowatchApi:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self._settings = settings
        self._client = client or httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0))

    async def close(self) -> None:
        await self._client.aclose()

    def _internal_headers(self) -> dict:
        return {"X-Internal-Secret": self._settings.internal_api_secret}

    async def token_for(self, identity: TelegramIdentity) -> dict:
        """-> {"access_token": ..., "user": {"id", "username", "telegram_id", "is_new"}}"""
        try:
            resp = await self._client.post(
                f"{self._settings.auth_service_url}/internal/telegram/token",
                json={
                    "telegram_id": identity.telegram_id,
                    "first_name": identity.first_name,
                    "last_name": identity.last_name,
                    "username": identity.username,
                },
                headers=self._internal_headers(),
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("auth /internal/telegram/token: %s", exc)
            raise CowatchApiError(str(exc)) from exc

    async def create_room(
        self,
        access_token: str,
        title: str,
        *,
        max_participants: int = 10,
        is_private: bool = True,
    ) -> dict:
        try:
            resp = await self._client.post(
                f"{self._settings.rooms_service_url}/rooms/",
                json={"title": title[:100], "is_private": is_private, "max_participants": max_participants},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("rooms POST /rooms/: %s", exc)
            raise CowatchApiError(str(exc)) from exc

    async def get_room(self, code: str) -> dict:
        try:
            resp = await self._client.get(f"{self._settings.rooms_service_url}/rooms/{code}")
        except httpx.HTTPError as exc:
            logger.warning("rooms GET /rooms/%s: %s", code, exc)
            raise CowatchApiError(str(exc)) from exc
        if resp.status_code == 404:
            raise RoomNotFound(code)
        if resp.is_error:
            raise CowatchApiError(f"rooms ответил {resp.status_code}")
        return resp.json()

    async def profile(self, user_id: int) -> dict:
        try:
            resp = await self._client.get(f"{self._settings.auth_service_url}/auth/profile/{user_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("auth GET /auth/profile/%s: %s", user_id, exc)
            raise CowatchApiError(str(exc)) from exc

    async def telegram_links(self, user_ids: list[int]) -> dict[int, dict]:
        """user_id -> {"telegram_id", "username"} только для привязанных к Telegram."""
        if not user_ids:
            return {}
        try:
            resp = await self._client.get(
                f"{self._settings.auth_service_url}/internal/telegram/users",
                params=[("user_ids", uid) for uid in user_ids],
                headers=self._internal_headers(),
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("auth GET /internal/telegram/users: %s", exc)
            raise CowatchApiError(str(exc)) from exc
        return {row["user_id"]: row for row in resp.json().get("users", [])}
