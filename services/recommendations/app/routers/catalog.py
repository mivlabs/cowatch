"""
Поиск по каталогу фильмов/сериалов — то, чем будет пользоваться экран
"создать комнату" на фронтенде, чтобы найти content_id по названию,
а не гадать число руками (как мы делали через psql).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.database import get_db
from app.models.content import ContentItem
from app.schemas.catalog import CatalogItem, CatalogSearchResponse

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/search", response_model=CatalogSearchResponse)
async def search_catalog(
    q: str = Query(..., min_length=1, description="Часть названия фильма/сериала"),
    media_type: str | None = Query(default=None, description="'movie', 'tv' или пусто — оба"),
    limit: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    stmt = select(ContentItem).where(ContentItem.title.ilike(f"%{q}%"))
    if media_type:
        stmt = stmt.where(ContentItem.media_type == media_type)
    stmt = stmt.order_by(ContentItem.popularity.desc()).limit(limit)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return CatalogSearchResponse(
        query=q,
        count=len(items),
        items=[CatalogItem.model_validate(item) for item in items],
    )


@router.get("/{content_id}", response_model=CatalogItem)
async def get_catalog_item(content_id: int, db=Depends(get_db)):
    """
    Получить одну карточку каталога по id — нужно для RoomPage.tsx: комната
    хранит только room.content_id (число), а показать хосту постер и
    название выбранного фильма прямо в комнате можно только вот так,
    отдельным запросом (разные БД, cross-service, никакого JOIN).
    """
    item = await db.get(ContentItem, content_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Контент с id={content_id} не найден в каталоге")
    return CatalogItem.model_validate(item)
