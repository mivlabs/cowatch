from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Pydantic схемы для ответа ---
class AchievementResponse(BaseModel):
    id: int
    title: str
    description: str
    icon: str
    unlocked_at: datetime

    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    id: int
    movie_title: str
    movie_url: str
    watched_at: datetime

    class Config:
        from_attributes = True

class ProfileStatsResponse(BaseModel):
    username: str
    email: Optional[str]
    total_movies: int
    total_hours: float  # Упрощенно: считаем 1 фильм = 2 часа для демо
    achievements: List[AchievementResponse]
    history: List[HistoryResponse]

# --- Эндпоинт ---
@router.get("/profile/{user_id}", response_model=ProfileStatsResponse)
async def get_profile_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.achievement import UserAchievement, Achievement
    from app.models.user import User # Убедись, что импорт правильный
    
    # 1. Получаем пользователя
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Получаем ачивки
    achievements_query = await db.execute(
        select(Achievement)
        .join(UserAchievement, Achievement.id == UserAchievement.achievement_id)
        .where(UserAchievement.user_id == user_id)
    )
    achievements = achievements_query.scalars().all()

    # 3. Получаем историю (последние 10)
    history_query = await db.execute(
        select(WatchHistory)
        .where(WatchHistory.user_id == user_id)
        .order_by(WatchHistory.watched_at.desc())
        .limit(10)
    )
    history = history_query.scalars().all()

    # 4. Считаем статистику
    total_movies = len(history)
    total_hours = total_movies * 2.0 # Заглушка, потом можно считать реальное время

    return ProfileStatsResponse(
        username=user.username,
        email=user.email,
        total_movies=total_movies,
        total_hours=total_hours,
        achievements=[AchievementResponse.from_orm(a) for a in achievements],
        history=[HistoryResponse.from_orm(h) for h in history]
    )