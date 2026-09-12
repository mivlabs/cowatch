from pydantic import BaseModel


class GrantAchievementRequest(BaseModel):
    user_id: int
    achievement_title: str


class RecordHistoryRequest(BaseModel):
    user_id: int
    movie_title: str
    movie_url: str = ""
    duration_seconds: float = 0


class InternalActionResponse(BaseModel):
    granted: bool
    reason: str | None = None
