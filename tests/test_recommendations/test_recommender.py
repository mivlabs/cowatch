"""
Юнит-тесты на чистую ML-логику (app/services/recommender.py) — без БД,
без event loop, работают на pandas DataFrame напрямую. Быстрые и
детерминированные, поэтому гоняются в общем pytest-процессе (в отличие от
test_recommendations_api.py, который следует паттерну tests/test_rooms
и требует настоящий Postgres).
"""
import pathlib
import sys

import pandas as pd
import pytest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[2] / "services" / "recommendations"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.services.recommender import ContentRecommender  # noqa: E402


@pytest.fixture
def content_df():
    return pd.DataFrame(
        [
            {"content_id": 1, "title": "Interstellar", "genres": ["Sci-Fi", "Drama"], "overview": "space wormhole survival"},
            {"content_id": 2, "title": "The Matrix", "genres": ["Sci-Fi", "Action"], "overview": "hacker reality simulation"},
            {"content_id": 3, "title": "La La Land", "genres": ["Musical", "Romance"], "overview": "jazz pianist actress love"},
            {"content_id": 4, "title": "Titanic", "genres": ["Romance", "Drama"], "overview": "ship love tragedy"},
        ]
    )


@pytest.fixture
def interactions_df():
    return pd.DataFrame(
        [
            {"user_id": 1, "content_id": 1, "joined_at": pd.Timestamp("2026-01-01")},
            {"user_id": 1, "content_id": 2, "joined_at": pd.Timestamp("2026-01-08")},
            {"user_id": 2, "content_id": 3, "joined_at": pd.Timestamp("2026-01-02")},
            {"user_id": 2, "content_id": 4, "joined_at": pd.Timestamp("2026-01-09")},
        ]
    )


def test_fit_builds_item_matrix(content_df, interactions_df):
    model = ContentRecommender()
    model.fit(content_df, interactions_df)

    assert model._item_matrix is not None
    assert model._item_matrix.shape[0] == len(content_df)
    assert model.trained_at is not None


def test_recommend_for_user_prefers_similar_genre(content_df, interactions_df):
    """Пользователь смотрел sci-fi — топ рекомендация должна быть про sci-fi, не про romance."""
    model = ContentRecommender()
    model.fit(content_df, interactions_df)

    recs = model.recommend_for_user(user_content_ids=[1], k=2)  # смотрел Interstellar
    rec_ids = [r["content_id"] for r in recs]

    assert 1 not in rec_ids  # уже просмотренное не рекомендуем повторно
    assert rec_ids[0] == 2  # The Matrix (Sci-Fi) должен обойти Titanic/La La Land (Romance)


def test_recommend_for_user_cold_start_falls_back_to_popularity(content_df, interactions_df):
    model = ContentRecommender()
    model.fit(content_df, interactions_df)

    recs = model.recommend_for_user(user_content_ids=[], k=3)

    assert len(recs) > 0
    assert all(r["reason"] == "popular_fallback" for r in recs)


def test_most_popular_excludes_given_ids(content_df, interactions_df):
    model = ContentRecommender()
    model.fit(content_df, interactions_df)

    recs = model.most_popular(k=5, exclude={1, 2})
    rec_ids = {r["content_id"] for r in recs}

    assert 1 not in rec_ids
    assert 2 not in rec_ids


def test_evaluate_leave_one_out_returns_reasonable_metrics(content_df, interactions_df):
    model = ContentRecommender()
    model.fit(content_df, interactions_df)

    metrics = model.evaluate_leave_one_out(interactions_df, k=2)

    assert metrics.n_eval_users == 2  # оба пользователя имеют >=2 просмотра
    assert 0.0 <= metrics.precision_at_k <= 1.0
    assert 0.0 <= metrics.hit_rate_at_k <= 1.0


def test_evaluate_leave_one_out_no_eligible_users_returns_zeroed_metrics(content_df):
    model = ContentRecommender()
    single_watch = pd.DataFrame(
        [{"user_id": 1, "content_id": 1, "joined_at": pd.Timestamp("2026-01-01")}]
    )
    model.fit(content_df, single_watch)

    metrics = model.evaluate_leave_one_out(single_watch, k=2)

    assert metrics.n_eval_users == 0
    assert metrics.precision_at_k == 0.0
