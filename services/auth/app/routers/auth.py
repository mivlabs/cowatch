import random
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.services.auth import (
    get_user_by_email,
    create_user,
    verify_password,
    create_access_token,
    create_refresh_token,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

# ==========================================
# PYDANTIC СХЕМЫ ДЛЯ ПРОФИЛЯ
# ==========================================
class AchievementResponse(BaseModel):
    id: int
    title: str
    description: str
    icon: str
    unlocked_at: datetime
    model_config = {"from_attributes": True}

class HistoryResponse(BaseModel):
    id: int
    movie_title: str
    movie_url: str
    watched_at: datetime
    model_config = {"from_attributes": True}

class ProfileStatsResponse(BaseModel):
    username: str
    email: Optional[str]
    total_movies: int
    total_hours: float
    achievements: List[AchievementResponse]
    history: List[HistoryResponse]

# ==========================================
# ЭНДПОИНТЫ
# ==========================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = await create_user(db, user_in)
    from app.models.achievement import Achievement, UserAchievement 
    
    first_step_achievement = await db.execute(
        select(Achievement).where(Achievement.title == "Первый шаг")
    )
    first_step_achievement = first_step_achievement.scalar_one_or_none()
    
    if not first_step_achievement:
        first_step_achievement = Achievement(
            title="Первый шаг",
            description="Зарегистрируйся в CoWatch",
            icon="🎬"
        )
        db.add(first_step_achievement)
        await db.commit()
        await db.refresh(first_step_achievement)

    user_achievement = UserAchievement(
        user_id=new_user.id,
        achievement_id=first_step_achievement.id
    )
    db.add(user_achievement)
    await db.commit()
    
    logger.info(f"User {new_user.email} получил ачивку 'Первый шаг'!")
    return new_user

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, user_in.email)
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.email, "user_id": user.id})
    
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/guest", response_model=Token)
async def login_as_guest(username: str = Query(..., min_length=2, max_length=20)):
    guest_id = random.randint(100000, 999999)
    access_token = create_access_token(data={"sub": f"guest_{username}", "user_id": guest_id})
    return Token(access_token=access_token, refresh_token="guest_session")

# ЭНДПОИНТ ПРОФИЛЯ:
@router.get("/profile/{user_id}", response_model=ProfileStatsResponse)
async def get_profile_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.achievement import UserAchievement, Achievement, WatchHistory
    from app.models.user import User 
    
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
    total_hours = total_movies * 2.0 # Заглушка: 1 фильм = 2 часа

    return ProfileStatsResponse(
        username=user.username,
        email=user.email,
        total_movies=total_movies,
        total_hours=total_hours,
        achievements=[AchievementResponse.model_validate(a) for a in achievements],
        history=[HistoryResponse.model_validate(h) for h in history]
    )