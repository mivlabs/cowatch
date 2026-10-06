from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # email и hashed_password пустые у аккаунтов, заведённых через Telegram
    # (см. services/telegram.py): у них нет ни почты, ни пароля, вход идёт по
    # подписи initData. Старые таблицы на проде получают DROP NOT NULL в
    # ensure_users_schema(), create_all колонки не меняет.
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    # Telegram user id — 64-битный, обычный Integer в Postgres его не вместит.
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
