import os
from fastapi import HTTPException, status, WebSocket
from jose import jwt, JWTError

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-this")
ALGORITHM = "HS256"


def decode_token(token: str) -> dict:
    """Декодирует JWT и возвращает payload. Выбрасывает 401 если токен невалиден."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


def get_user_id_from_token(token: str) -> int:
    """Извлекает user_id из токена."""
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user_id"
        )
    return int(user_id)


def get_user_email_from_token(token: str) -> str:
    """Извлекает email (sub) из токена."""
    payload = decode_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email"
        )
    return email