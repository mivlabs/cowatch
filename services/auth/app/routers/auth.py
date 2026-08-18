import random
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.services.auth import (
    get_user_by_email,
    create_user,
    verify_password,
    create_access_token,
    create_refresh_token,
)

# Инициализация логгера для отслеживания событий безопасности
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    
    # Регистрирует нового пользователя.
    # Проверяет уникальность email перед созданием записи в БД.
    
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = await create_user(db, user_in)
    from app.models.achievement import Achievement, UserAchievement # Ачивка "Первый шаг"
    
    # Проверяем, существует ли ачивка, если нет - создаем
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

    # Привязываем ачивку к новому пользователю
    user_achievement = UserAchievement(
        user_id=new_user.id,
        achievement_id=first_step_achievement.id
    )
    db.add(user_achievement)
    await db.commit()
    
    logger.info(f"User {new_user.email} получил ачивку 'Первый шаг'!")
    logger.info(f"User registered successfully: {new_user.email}")
    return new_user

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    
    # Аутентифицирует пользователя и возвращает пару JWT токенов (access + refresh).
    
    user = await get_user_by_email(db, user_in.email)
    if not user or not verify_password(user_in.password, user.hashed_password):
        # Возвращаем общую ошибку, чтобы не раскрывать, существует ли email
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
    
    # Генерирует валидный JWT токен для гостевого пользователя.

    guest_id = random.randint(100000, 999999)
    
    access_token = create_access_token(data={"sub": f"guest_{username}", "user_id": guest_id})
    
    # Возвращаем объект Token, чтобы удовлетворить требования Pydantic схемы.
    # Refresh token для гостя не нужен, передаем пустую строку или фиктивное значение.
    return Token(access_token=access_token, refresh_token="guest_session")