"""
Асинхронный клиент к TMDB (themoviedb.org) для загрузки каталога фильмов
и сериалов CoWatch.

Раньше (первая версия) этот клиент пытался УГАДАТЬ фильм по кривому
названию, вытащенному из пользовательской ссылки (search_movie) — это было
ошибочным решением: пользователи CoWatch делятся ссылками на Rutube/YouTube/
прямые файлы, названия там либо отсутствуют, либо не похожи на официальные
названия фильмов (см. README сервиса, раздел про историю решений).

Теперь клиент работает в обратную сторону и гораздо надёжнее: мы САМИ
листаем готовые подборки TMDB ("популярное", "топ по рейтингу") и грузим
их к себе целиком, без всякого угадывания. Пользователь потом выбирает
фильм ИЗ этого каталога — значит, привязка к TMDB id гарантированно верна.

TMDB "movie" и "tv" — это два разных набора эндпоинтов (разные жанры,
разные подборки), поэтому почти везде есть параметр media_type.
"""
import httpx

from app.core.config import settings

_ENDPOINTS = {
    "movie": "movie/popular",
    "tv": "tv/popular",
}
_GENRE_ENDPOINTS = {
    "movie": "genre/movie/list",
    "tv": "genre/tv/list",
}


class TMDBClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key if api_key is not None else settings.tmdb_api_key
        self.base_url = base_url or settings.tmdb_base_url

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def fetch_popular(self, media_type: str, page: int = 1) -> list[dict]:
        """
        Одна страница подборки "популярное" — TMDB отдаёт по 20 штук на
        страницу. page идёт от 1 (как в самом API TMDB, не с нуля).

        media_type: "movie" или "tv".
        """
        if not self.enabled:
            return []
        if media_type not in _ENDPOINTS:
            raise ValueError(f"media_type должен быть 'movie' или 'tv', получили {media_type!r}")

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/{_ENDPOINTS[media_type]}",
                params={"api_key": self.api_key, "language": "ru-RU", "page": page},
            )
            resp.raise_for_status()
            return resp.json().get("results", [])

    async def genre_map(self, media_type: str) -> dict[int, str]:
        """id жанра -> название. У movie и tv СВОИ отдельные списки жанров в TMDB."""
        if not self.enabled:
            return {}
        if media_type not in _GENRE_ENDPOINTS:
            raise ValueError(f"media_type должен быть 'movie' или 'tv', получили {media_type!r}")

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/{_GENRE_ENDPOINTS[media_type]}",
                params={"api_key": self.api_key, "language": "ru-RU"},
            )
            resp.raise_for_status()
            genres = resp.json().get("genres", [])

        return {g["id"]: g["name"] for g in genres}

    async def fetch_movie_details(self, tmdb_id: int) -> dict | None:
        """Полная карточка фильма по id — нужна ради overview (описание сюжета),
        которого нет в MovieLens. 404 — нормальная ситуация (bad/устаревший id
        в links.csv), просто пропускаем такой фильм, не роняем весь импорт."""
        if not self.enabled:
            return None
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/movie/{tmdb_id}",
                params={"api_key": self.api_key, "language": "ru-RU"},
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def to_content_dict(raw: dict, media_type: str, genre_map: dict[int, str]) -> dict:
        """Превращает сырой JSON-объект от TMDB в плоский словарь под нашу модель ContentItem."""
        title = raw.get("title") if media_type == "movie" else raw.get("name")
        release_date = raw.get("release_date") if media_type == "movie" else raw.get("first_air_date")
        genre_names = [genre_map[g] for g in raw.get("genre_ids", []) if g in genre_map]

        return {
            "tmdb_id": raw["id"],
            "media_type": media_type,
            "title": title or "",
            "overview": raw.get("overview") or "",
            "genres": genre_names,
            "popularity": raw.get("popularity", 0.0),
            "poster_path": raw.get("poster_path"),
            "release_year": _parse_year(release_date),
        }


def _parse_year(release_date: str | None) -> int | None:
    if not release_date:
        return None
    try:
        return int(release_date.split("-")[0])
    except (ValueError, IndexError):
        return None
