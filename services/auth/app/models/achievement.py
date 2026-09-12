from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)          
    description = Column(String, nullable=False)  
    icon = Column(String, nullable=False)          
    
    # Связь с пользователем (кто разблокировал)
    user_achievements = relationship("UserAchievement", back_populates="achievement")

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    achievement = relationship("Achievement", back_populates="user_achievements")

class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_title = Column(String, nullable=False)
    movie_url = Column(String, nullable=False)
    # Реальная длительность просмотра (video.watch_completed из rooms), в минутах.
    # Раньше эта таблица никогда не заполнялась, а total_hours в /profile
    # считался как total_movies * 2.0 — теперь считаем из фактических данных.
    duration_minutes = Column(Integer, nullable=False, default=0)
    watched_at = Column(DateTime(timezone=True), server_default=func.now())