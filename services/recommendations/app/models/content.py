from sqlalchemy import Column, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.database import Base


class ContentItem(Base):
    """
    Одна карточка каталога — фильм или сериал, загруженный из TMDB.

    Раньше (первая версия) эта таблица заполнялась попыткой угадать фильм по
    кривому названию из пользовательской ссылки — это не работало (см.
    services/recommendations/README.md, история про Vimeo/Rutube/файлы без
    метаданных). Теперь наоборот: мы САМИ загружаем каталог из TMDB
    (см. ml/import_catalog.py), и только потом пользователь выбирает фильм
    из этого каталога при создании комнаты. Поэтому tmdb_id обязателен и
    уникален — каждая строка гарантированно пришла из TMDB, гадать не нужно.
    """

    __tablename__ = "content_items"
    __table_args__ = (UniqueConstraint("tmdb_id", "media_type", name="uq_tmdb_id_media_type"),)

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, nullable=False, index=True)
    media_type = Column(String(10), nullable=False)  # "movie" | "tv"

    title = Column(String(300), nullable=False, index=True)
    overview = Column(Text, nullable=True, default="")
    genres = Column(JSONB, nullable=False, default=list)  # ["Action", "Sci-Fi"]
    popularity = Column(Float, nullable=True, default=0.0)
    # Рейтинг TMDB (0..10) и число голосов — нужны ранжированию: без них
    # холодный старт и персональная выдача не отличают "Интерстеллар" от
    # никому не известной драмы с теми же жанрами (см. recommender.py).
    vote_average = Column(Float, nullable=True, default=0.0)
    vote_count = Column(Integer, nullable=True, default=0)
    original_language = Column(String(10), nullable=True)
    poster_path = Column(String(300), nullable=True)
    release_year = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
