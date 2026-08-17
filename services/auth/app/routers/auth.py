import random
from fastapi import Query
from app.schemas.user import Token
from app.core.security import create_access_token
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.services.auth import (
    get_user_by_email,
    create_user,
    verify_password,
    create_access_token,
    create_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = await create_user(db, user_in)
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
    # Генерируем случайный ID для гостя (от 100000 до 999999)
    guest_id = random.randint(100000, 999999)
    
    # Создаем настоящий JWT токен, который бэкенд сможет расшифровать
    access_token = create_access_token(data={"sub": f"guest_{username}", "user_id": guest_id})
    
    return {"access_token": access_token, "token_type": "bearer"}

