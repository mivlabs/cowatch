"""
Юнит-тесты на приор популярности/рейтинга в ContentRecommender — без БД,
на pandas DataFrame. Проверяют именно те симптомы, с которых началась
доработка: холодный старт из двух карточек, "Hibla 2" выше "Интерстеллара"
при одинаковых жанрах, неизвестные фильмы в выдаче.
"""
import pathlib
import sys

import pandas as pd

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "recommendations"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.services.recommender import ContentRecommender  # noqa: E402
from app.services.tmdb_client import TMDBClient  # noqa: E402


def _catalog():
    return pd.DataFrame(
        [
            # Две знаменитые драмы и одна никому не известная — жанры одинаковые.
            {"content_id": 1, "title": "Interstellar", "media_type": "movie", "genres": ["драма", "фантастика"],
             "overview": "", "popularity": 120.0, "vote_average": 8.4, "vote_count": 35000},
            {"content_id": 2, "title": "Arrival", "media_type": "movie", "genres": ["драма", "фантастика"],
             "overview": "", "popularity": 60.0, "vote_average": 7.6, "vote_count": 18000},
            {"content_id": 3, "title": "Hibla 2", "media_type": "movie", "genres": ["драма", "фантастика"],
             "overview": "", "popularity": 3.0, "vote_average": 9.5, "vote_count": 4},
            # Хит другого жанра — для холодного старта.
            {"content_id": 4, "title": "Avengers", "media_type": "movie", "genres": ["боевик", "приключения"],
             "overview": "", "popularity": 300.0, "vote_average": 8.2, "vote_count": 29000},
            {"content_id": 5, "title": "Spider-Man", "media_type": "movie", "genres": ["боевик", "приключения"],
             "overview": "", "popularity": 90.0, "vote_average": 7.9, "vote_count": 20000},
            # Ещё не вышедший фильм: голосов нет.
            {"content_id": 6, "title": "Unreleased", "media_type": "movie", "genres": ["боевик"],
             "overview": "", "popularity": 500.0, "vote_average": 0.0, "vote_count": 0},
        ]
    )


def _watches():
    # Единственный совместный просмотр в CoWatch — Spider-Man.
    return pd.DataFrame([{"user_id": 7, "content_id": 5, "joined_at": pd.Timestamp("2026-09-01")}])


def test_cold_start_returns_full_top_not_only_watched():
    model = ContentRecommender(min_votes=50)
    model.fit(_catalog(), _watches())

    recs = model.most_popular(k=10)
    ids = [r["content_id"] for r in recs]

    assert set(ids) == {1, 2, 4, 5}  # весь каталог с голосами, не только одна просмотренная
    assert 6 not in ids  # без голосов — не рекомендуем
    assert 3 not in ids  # четыре голоса — тоже мало
    assert ids[0] in (4, 5)  # наверху хиты, а не Hibla 2


def test_personalized_prefers_known_film_among_same_genres():
    model = ContentRecommender(min_votes=50)
    model.fit(_catalog(), _watches())

    recs = model.recommend_for_user(user_content_ids=[2], k=3)  # смотрел Arrival
    ids = [r["content_id"] for r in recs]

    assert ids[0] == 1  # Interstellar: та же пара жанров, но реальный рейтинг и популярность
    assert 3 not in ids  # Hibla 2 с четырьмя голосами в выдачу не попадает
    assert 2 not in ids  # просмотренное не повторяем


def test_without_rating_columns_behaves_like_plain_tfidf():
    df = _catalog()[["content_id", "title", "genres", "overview"]]
    model = ContentRecommender(min_votes=50)
    model.fit(df, _watches())

    assert model.n_eligible == len(df)
    assert len(model.most_popular(k=10)) == len(df)


def test_tmdb_filter_drops_talk_shows_and_unvoted():
    talk_show = {"id": 1, "name": "Tagesschau", "genre_ids": [10763], "vote_count": 500}
    drama = {"id": 2, "name": "House", "genre_ids": [18], "vote_count": 500}
    fresh = {"id": 3, "title": "New", "genre_ids": [28], "vote_count": 3}

    assert not TMDBClient.is_wanted(talk_show, "tv")
    assert TMDBClient.is_wanted(drama, "tv")
    assert TMDBClient.is_wanted(fresh, "movie", min_votes=0)
    assert not TMDBClient.is_wanted(fresh, "movie", min_votes=20)


def test_tmdb_filter_drops_untranslated_titles():
    assert not TMDBClient.is_wanted({"id": 1, "name": "सीआईडी", "genre_ids": [18], "vote_count": 500}, "tv")
    assert TMDBClient.is_wanted({"id": 2, "title": "1+1", "genre_ids": [18], "vote_count": 500}, "movie")
    assert TMDBClient.is_wanted({"id": 3, "title": "Интерстеллар", "genre_ids": [18], "vote_count": 500}, "movie")


def test_cold_start_mixes_movies_and_shows():
    df = pd.DataFrame(
        [
            {"content_id": i, "title": f"Show {i}", "media_type": "tv", "genres": ["драма"], "overview": "",
             "popularity": 1000.0, "vote_average": 8.5, "vote_count": 10000}
            for i in range(1, 6)
        ]
        + [
            {"content_id": i, "title": f"Movie {i}", "media_type": "movie", "genres": ["драма"], "overview": "",
             "popularity": 10.0, "vote_average": 7.0, "vote_count": 10000}
            for i in range(6, 11)
        ]
    )
    model = ContentRecommender(min_votes=50)
    model.fit(df, pd.DataFrame(columns=["user_id", "content_id", "joined_at"]))

    types = [r["media_type"] for r in model.most_popular(k=6)]
    assert types == ["movie", "movie", "tv", "movie", "movie", "tv"]

    # Та же квота в персональной выдаче: смотрел один сериал — получает и фильмы.
    personal = [r["media_type"] for r in model.recommend_for_user([1], k=6)]
    assert personal == ["movie", "movie", "tv", "movie", "movie", "tv"]


def test_to_content_dict_keeps_rating_fields():
    raw = {"id": 42, "title": "X", "genre_ids": [28], "popularity": 12.5, "vote_average": 7.1,
           "vote_count": 900, "original_language": "en", "release_date": "2020-05-01"}
    content = TMDBClient.to_content_dict(raw, "movie", {28: "боевик"})

    assert content["vote_average"] == 7.1
    assert content["vote_count"] == 900
    assert content["original_language"] == "en"
    assert content["genres"] == ["боевик"]
