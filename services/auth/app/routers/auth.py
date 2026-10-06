import random
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.achievement import Achievement, UserAchievement, WatchHistory
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.services.auth import (
    get_user_by_email,
    get_user_by_username,
    create_user,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.services.achievement_service import CATEGORY_ORDER, grant_achievement

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

# ==========================================
# PYDANTIC СХЕМЫ ДЛЯ ПРОФИЛЯ
# ==========================================
class AchievementResponse(BaseModel):
    id: int
    code: str
    title: str
    description: str
    icon: str
    category: str
    # None — наклейка ещё не получена. Профиль отдаёт всю коллекцию, чтобы
    # фронт показывал и закрытые наклейки с подсказкой, как их добыть.
    unlocked_at: Optional[datetime]
    model_config = {"from_attributes": True}

class HistoryResponse(BaseModel):
    id: int
    movie_title: str
    movie_url: str
    duration_minutes: int
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

    existing_username = await get_user_by_username(db, user_in.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    new_user = await create_user(db, user_in)
    await grant_achievement(db, new_user.id, "first_step")
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
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id, "username": user.username})
    refresh_token = create_refresh_token(data={"sub": user.email, "user_id": user.id, "username": user.username})
    
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/guest", response_model=Token)
async def login_as_guest(username: str = Query(..., min_length=2, max_length=20)):
    # Гости не получают ачивки и watch-history: у них нет строки в таблице
    # users (guest_id — случайное число, не первичный ключ), а UserAchievement
    # и WatchHistory ссылаются на users.id через FK. Это осознанное решение,
    # а не забытый баг — см. docstring achievement_service.py. grant_achievement
    # и record_watch_history тихо игнорируют неизвестные user_id именно из-за
    # гостевых токенов вроде этого.
    guest_id = random.randint(100000, 999999)
    access_token = create_access_token(data={"sub": f"guest_{username}", "user_id": guest_id})
    return Token(access_token=access_token, refresh_token="guest_session")

# 🔥 ИСПРАВЛЕННЫЙ ЭНДПОИНТ ПРОФИЛЯ (Работает и для гостей, и без ошибки username)
@router.get("/profile/{user_id}", response_model=ProfileStatsResponse)
async def get_profile_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    # 1. Пытаемся получить пользователя из БД
    user = await db.get(User, user_id)
    
    # 2. Если пользователя нет в БД — это ГОСТЬ. Возвращаем безопасный профиль, чтобы фронтенд не падал.
    if not user:
        return ProfileStatsResponse(
            username=f"Гость_{user_id}",
            email=None,
            total_movies=0,
            total_hours=0.0,
            achievements=[],
            history=[]
        )

    # 3. username теперь реальное поле модели (nullable=False), фолбэки нужны
    # только для строк, заведённых до этой миграции (см. backfill-скрипт)
    display_name = user.username or user.email or f"User_{user.id}"

    # 4. Вся коллекция ачивок: outer join на UserAchievement этого пользователя,
    # unlocked_at = None для ещё не полученных. Порядок — группа, потом
    # sort_order внутри группы (см. SEED_ACHIEVEMENTS).
    user_unlocks = (
        select(UserAchievement.achievement_id, UserAchievement.unlocked_at)
        .where(UserAchievement.user_id == user_id)
        .subquery()
    )
    achievements_query = await db.execute(
        select(Achievement, user_unlocks.c.unlocked_at)
        .outerjoin(user_unlocks, Achievement.id == user_unlocks.c.achievement_id)
        .order_by(Achievement.category, Achievement.sort_order, Achievement.id)
    )
    achievement_rows = achievements_query.all()
    achievement_rows.sort(key=lambda row: (CATEGORY_ORDER.get(row[0].category, 99), row[0].sort_order, row[0].id))
    achievements = [
        AchievementResponse(
            id=achievement.id,
            code=achievement.code,
            title=achievement.title,
            description=achievement.description,
            icon=achievement.icon,
            category=achievement.category,
            unlocked_at=unlocked_at,
        )
        for achievement, unlocked_at in achievement_rows
    ]

    # 5. Получаем историю (последние 10)
    history_query = await db.execute(
        select(WatchHistory)
        .where(WatchHistory.user_id == user_id)
        .order_by(WatchHistory.watched_at.desc())
        .limit(10)
    )
    history = history_query.scalars().all()

    # 6. Статистика по ВСЕЙ истории, а не по последним 10 записям из шага 5:
    # иначе часы в шапке профиля переставали расти после десятого просмотра,
    # а «Марафонец» (10 часов, считается в notifications) приходил при цифре
    # заметно меньше 10.
    totals = (
        await db.execute(
            select(func.count(WatchHistory.id), func.coalesce(func.sum(WatchHistory.duration_minutes), 0))
            .where(WatchHistory.user_id == user_id)
        )
    ).one()
    total_movies = int(totals[0])
    total_hours = round(int(totals[1]) / 60, 2)

    return ProfileStatsResponse(
        username=display_name,
        email=user.email,
        total_movies=total_movies,
        total_hours=total_hours,
        achievements=achievements,
        history=[HistoryResponse.model_validate(h) for h in history]
    )