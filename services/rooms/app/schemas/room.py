from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class RoomCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    is_private: bool = True
    max_participants: int = Field(default=10, ge=2, le=50)


class RoomResponse(BaseModel):
    id: UUID
    code: str
    host_id: int
    title: str
    is_private: bool
    max_participants: int
    current_movie_url: Optional[str] = None
    current_movie_title: Optional[str] = None
    current_position: int
    is_playing: bool
    created_at: datetime
    participants_count: int

    class Config:
        from_attributes = True


class JoinRoomResponse(BaseModel):
    room: RoomResponse
    user_role: str