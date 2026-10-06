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

# Подборки TMDB, которые листает импорт. "popular" — то, что смотрят
# прямо сейчас (включая свежие релизы), "top_rated" — проверенная
# классика с большим числом голосов. Вместе они дают каталог, в котором
# есть и новинки, и "Побег из Шоушенка".
LISTS = ("popular", "top_rated")

_ENDPOINTS = {
    ("movie", "popular"): "movie/popular",
    ("movie", "top_rated"): "movie/top_rated",
    ("tv", "popular"): "tv/popular",
    ("tv", "top_rated"): "tv/top_rated",
}
_GENRE_ENDPOINTS = {
    "movie": "genre/movie/list",
    "tv": "genre/tv/list",
}

# Жанры сериалов TMDB, которые в каталоге "что посмотреть вместе" не нужны:
# в tv/popular они занимают половину выдачи (ежедневные новости, ток-шоу,
# мыльные оперы и реалити вроде Tagesschau, Paradise Hotel, Gran hermano).
# id — официальные из genre/tv/list, не меняются.
EXCLUDED_TV_GENRE_IDS = frozenset(
    {
        10763,  # News
        10764,  # Reality
        10766,  # Soap
        10767,  # Talk
    }
)


class TMDBClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key if api_key is not None else settings.tmdb_api_key
        self.base_url = base_url or settings.tmdb_base_url

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def fetch_list(self, media_type: str, list_name: str = "popular", page: int = 1) -> list[dict]:
        """
        Одна страница подборки — TMDB отдаёт по 20 штук на страницу.
        page идёт от 1 (как в самом API TMDB, не с нуля).

        media_type: "movie" или "tv"; list_name: "popular" или "top_rated".
        """
        if not self.enabled:
            return []
        key = (media_type, list_name)
        if key not in _ENDPOINTS:
            raise ValueError(f"Неизвестная подборка {media_type!r}/{list_name!r}")

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/{_ENDPOINTS[key]}",
                params={"api_key": self.api_key, "language": "ru-RU", "page": page},
            )
            resp.raise_for_status()
            return resp.json().get("results", [])

    async def fetch_popular(self, media_type: str, page: int = 1) -> list[dict]:
        """Обратная совместимость: та же fetch_list(..., "popular")."""
        return await self.fetch_list(media_type, "popular", page=page)

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
    def is_wanted(raw: dict, media_type: str, min_votes: int = 0) -> bool:
        """
        Стоит ли вообще класть карточку в каталог: сериалы из исключённых
        жанров (новости/ток-шоу/мыло/реалити) и карточки, за которые почти
        никто не голосовал, в "что посмотреть вместе" не попадают.
        """
        genre_ids = set(raw.get("genre_ids") or [])
        if media_type == "tv" and genre_ids & EXCLUDED_TV_GENRE_IDS:
            return False
        if int(raw.get("vote_count") or 0) < min_votes:
            return False
        title = raw.get("title") if media_type == "movie" else raw.get("name")
        return bool(title)

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
            "popularity": float(raw.get("popularity") or 0.0),
            "vote_average": float(raw.get("vote_average") or 0.0),
            "vote_count": int(raw.get("vote_count") or 0),
            "original_language": raw.get("original_language"),
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
