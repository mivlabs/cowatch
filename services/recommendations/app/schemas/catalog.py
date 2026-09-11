from typing import Optional
from pydantic import BaseModel


class CatalogItem(BaseModel):
    id: int
    title: str
    media_type: str
    genres: list[str] = []
    poster_path: Optional[str] = None
    release_year: Optional[int] = None

    class Config:
        from_attributes = True


class CatalogSearchResponse(BaseModel):
    query: str
    count: int
    items: list[CatalogItem]