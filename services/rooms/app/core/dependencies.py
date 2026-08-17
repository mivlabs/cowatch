from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import get_user_id_from_token, get_user_email_from_token


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Извлекает текущего пользователя из заголовка Authorization."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme"
        )
    
    token = authorization.replace("Bearer ", "")
    
    user_id = get_user_id_from_token(token)
    email = get_user_email_from_token(token)
    
    return {"id": user_id, "email": email}