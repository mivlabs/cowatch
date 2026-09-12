from sqlalchemy import Column, Integer, String, UniqueConstraint

from app.database import Base


class UserCounter(Base):
    """Накопительные счётчики по событиям, нужные для порогов ачивок
    (5 комнат, 100 сообщений, 10 часов просмотра...). Живут здесь, а не в
    auth/rooms/messages — notifications единственный слушает все события
    и единственный, кому нужна эта агрегация."""

    __tablename__ = "user_counters"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_user_counter"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    value = Column(Integer, nullable=False, default=0)
