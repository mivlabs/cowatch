from pydantic import BaseModel, Field


class TelegramInitDataRequest(BaseModel):
    """Тело POST /auth/telegram: сырая строка Telegram.WebApp.initData."""
    init_data: str = Field(..., min_length=1, max_length=4096)


class TelegramUserResponse(BaseModel):
    id: int
    username: str
    telegram_id: int
    is_new: bool


class TelegramAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: TelegramUserResponse


class InternalTelegramTokenRequest(BaseModel):
    """Бот просит токен для пользователя Telegram, чтобы создать комнату от его имени."""
    telegram_id: int
    first_name: str = Field(default="", max_length=128)
    last_name: str | None = Field(default=None, max_length=128)
    username: str | None = Field(default=None, max_length=64)


class TelegramLink(BaseModel):
    user_id: int
    telegram_id: int
    username: str


class TelegramLinksResponse(BaseModel):
    users: list[TelegramLink]
