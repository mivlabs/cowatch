from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecommendedItem(BaseModel):
    content_id: Optional[int]
    title: str
    genres: list[str] = []
    score: float
    reason: str  # "personalized" | "popular_fallback" | "similar_to"


class RecommendationsResponse(BaseModel):
    user_id: int
    strategy: str  # "content_based" | "popularity_cold_start"
    model_version: Optional[str] = None
    generated_at: datetime
    items: list[RecommendedItem]


class ModelInfo(BaseModel):
    model_version: Optional[str]
    trained_at: Optional[datetime]
    n_items: int
    n_users: int
    n_interactions: int
    precision_at_k: Optional[float] = None
    recall_at_k: Optional[float] = None
    hit_rate_at_k: Optional[float] = None
    k: int = 10
