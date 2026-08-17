from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class Channel(Base):
    __tablename__ = "channels"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    sender_id = Column(Integer, nullable=False) # Пока упрощённо, позже привяжем к auth
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())