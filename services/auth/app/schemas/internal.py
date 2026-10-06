from pydantic import BaseModel


class GrantAchievementRequest(BaseModel):
    user_id: int
    # Ключ ачивки — code (см. SEED_ACHIEVEMENTS). achievement_title оставлен
    # для старого notifications на время раскатки: оба сервиса деплоятся одним
    # пушем, но перезапускаются не одновременно.
    achievement_code: str | None = None
    achievement_title: str | None = None


class RecordHistoryRequest(BaseModel):
    user_id: int
    movie_title: str
    movie_url: str = ""
    duration_seconds: float = 0


class InternalActionResponse(BaseModel):
    granted: bool
    reason: str | None = None
