import os

from jose import JWTError, jwt

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-this")
ALGORITHM = "HS256"


def get_user_id_from_token(token: str) -> int:
    """Извлекает user_id из JWT. Кидает исключение, если токен невалиден или без user_id."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("user_id")
    if not user_id:
        raise JWTError("Token missing user_id")
    return int(user_id)
