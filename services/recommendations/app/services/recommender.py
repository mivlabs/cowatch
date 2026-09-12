"""
Content-based рекомендатель на TF-IDF + косинусной близости.

Почему content-based, а не collaborative filtering — на старте:
у CoWatch мало пользователей и мало пересечений "кто что смотрел вместе"
(классическая cold-start проблема разреженной матрицы user-item). Content-based
работает даже с одним просмотром на пользователя, потому что не требует
похожих пользователей — только описание контента. Collaborative filtering
(implicit ALS / matrix factorization) — следующий шаг, см. README, roadmap.

Дизайн специально не завязан на SQLAlchemy/БД: на вход — pandas DataFrame,
на выход — pandas/словари. Это даёт: (1) юнит-тесты без поднятого Postgres,
(2) train.py и API используют один и тот же класс.

Почему ДВА отдельных TfidfVectorizer, а не один общий текст (жанры+overview
через "+")
--------------------------------------------------------------------------
Первая версия (один общий TfidfVectorizer на объединённый текст) на
MovieLens с реальными overview из TMDB показала hit_rate@10 = 0.0 —
хуже, чем genre-only baseline (0.33%). Причина: жанры (~20 слов на весь
каталог) и overview (обычная связная русская речь) — это фичи разной
природы. Одни и те же гиперпараметры (min_df/max_df) для них работают
плохо в обе стороны: без фильтрации общая лексика синопсисов ("он",
"история", "жизнь") забивает сигнал и делает почти все фильмы одинаково
"похожими"; агрессивная фильтрация (max_df) наоборот случайно вырезает
сами жанровые слова, если они попадаются больше чем в N% фильмов (жанр
Drama/Comedy — как раз такой случай на 9742 фильмах).

Решение: жанры и overview векторизуются РАЗДЕЛЬНО, каждый своими
подходящими настройками, L2-нормализуются по отдельности (чтобы разный
масштаб/размер словарей не перекашивал сумму), взвешиваются и
склеиваются в один вектор. Жанровый блок получает больший вес
(genre_weight), потому что это более надёжный, чем текст, сигнал при
нашем размере каталога.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Компактный, но покрывающий основные случаи список русских стоп-слов.
# sklearn не поставляет готовый список для русского (только "english"),
# поэтому держим свой — вручную, без внешней загрузки (nltk.download и
# подобное было бы лишней сетевой зависимостью ради ~150 слов).
RUSSIAN_STOP_WORDS = frozenset(
    """
    и в во не что он на я с со как а то все она так его но да ты к у же вы
    за бы по только ее мне было вот от меня еще нет о из ему теперь когда
    даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж
    вам ведь там потом себя ничего ей может они тут где есть надо ней для
    мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж
    тогда кто этот того потому этого какой совсем ним здесь этом один почти
    мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец
    два об другой хоть после над больше тот через эти нас про всего них
    какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше
    чуть том нельзя такой им более всегда конечно всю между это эта эти оно
    также которая который которые которых которую его её их свой своё своя
    свои
    """.split()
)


def _l2_normalize_rows(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1e-10
    return matrix / norms


@dataclass
class EvalMetrics:
    precision_at_k: float
    recall_at_k: float
    hit_rate_at_k: float
    k: int
    n_eval_users: int


@dataclass
class ContentRecommender:
    k_default: int = 10

    # Жанры: маленький, категориальный словарь (~20 слов на весь каталог) —
    # НЕ фильтруем, каждое слово несёт сигнал.
    genre_vectorizer: TfidfVectorizer = field(default_factory=lambda: TfidfVectorizer())
    # Overview: обычный связный текст — нужна фильтрация общей лексики.
    overview_vectorizer: TfidfVectorizer = field(
        default_factory=lambda: TfidfVectorizer(
            max_features=3000, min_df=2, max_df=0.5, stop_words=list(RUSSIAN_STOP_WORDS)
        )
    )
    genre_weight: float = 2.0
    overview_weight: float = 1.0

    _item_matrix: np.ndarray | None = field(default=None, init=False, repr=False)
    _content_df: pd.DataFrame | None = field(default=None, init=False, repr=False)
    _content_id_to_idx: dict[int, int] = field(default_factory=dict, init=False, repr=False)
    _popularity: pd.Series | None = field(default=None, init=False, repr=False)
    trained_at: datetime | None = field(default=None, init=False)

    def fit(self, content_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "ContentRecommender":
        """
        content_df: columns [content_id, title, genres (list[str]), overview]
        interactions_df: columns [user_id, content_id, joined_at]
        """
        content_df = content_df.reset_index(drop=True)

        genre_texts = content_df["genres"].apply(
            lambda g: " ".join(g) if isinstance(g, list) else str(g or "")
        )
        overview_texts = content_df.get("overview", pd.Series([""] * len(content_df))).fillna("")

        genre_matrix = self.genre_vectorizer.fit_transform(genre_texts).toarray()
        overview_matrix = self.overview_vectorizer.fit_transform(overview_texts).toarray()

        genre_matrix = _l2_normalize_rows(genre_matrix) * self.genre_weight
        overview_matrix = _l2_normalize_rows(overview_matrix) * self.overview_weight

        self._item_matrix = np.hstack([genre_matrix, overview_matrix])
        self._content_df = content_df
        self._content_id_to_idx = {cid: i for i, cid in enumerate(content_df["content_id"])}

        self._popularity = (
            interactions_df.groupby("content_id")["user_id"].nunique().sort_values(ascending=False)
        )
        self.trained_at = datetime.now(timezone.utc)
        return self

    def _user_profile(self, user_content_ids: list[int]) -> np.ndarray | None:
        idxs = [self._content_id_to_idx[c] for c in user_content_ids if c in self._content_id_to_idx]
        if not idxs:
            return None
        return self._item_matrix[idxs].mean(axis=0).reshape(1, -1)

    def most_popular(self, k: int | None = None, exclude: set[int] | None = None) -> list[dict]:
        k = k or self.k_default
        exclude = exclude or set()
        assert self._popularity is not None and self._content_df is not None

        ranked = [cid for cid in self._popularity.index if cid not in exclude][:k]
        return [self._as_item(cid, score=float(self._popularity.loc[cid]), reason="popular_fallback") for cid in ranked]

    def recommend_for_user(self, user_content_ids: list[int], k: int | None = None) -> list[dict]:
        """user_content_ids — контент, который пользователь уже смотрел (для персонализации и исключения из выдачи)."""
        k = k or self.k_default
        watched = set(user_content_ids)

        profile = self._user_profile(user_content_ids)
        if profile is None:
            return self.most_popular(k=k, exclude=watched)

        sims = cosine_similarity(profile, self._item_matrix)[0]
        order = np.argsort(-sims)

        items = []
        for idx in order:
            cid = self._content_df.iloc[idx]["content_id"]
            if cid in watched:
                continue
            score = float(sims[idx])
            if score <= 0:
                break
            items.append(self._as_item(cid, score=score, reason="personalized"))
            if len(items) >= k:
                break

        if len(items) < k:
            items += self.most_popular(k=k - len(items), exclude=watched | {i["content_id"] for i in items})
        return items

    def _as_item(self, content_id: int, score: float, reason: str) -> dict:
        row = self._content_df.iloc[self._content_id_to_idx[content_id]]
        release_year = row.get("release_year")
        return {
            "content_id": int(content_id),
            "title": row["title"],
            "genres": row["genres"] if isinstance(row["genres"], list) else [],
            "score": round(score, 4),
            "reason": reason,
            # .get(), не row["poster_path"] — content_df для MovieLens (ml/train.py)
            # этих колонок не содержит вовсе, только для реального каталога
            # (ml/train_from_catalog.py).
            "poster_path": row.get("poster_path") or None,
            "release_year": None if pd.isna(release_year) else int(release_year),
        }

    def evaluate_leave_one_out(self, interactions_df: pd.DataFrame, k: int = 10) -> EvalMetrics:
        """
        Leave-one-out по времени: для каждого пользователя с >=2 просмотрами
        прячем самый последний (по joined_at) и проверяем, попадает ли он в
        top-K, построенный по всем остальным его просмотрам.

        precision@k = среднее (1 hit / k) по пользователям
        recall@k    = среднее (1 hit / 1 held-out item) = то же самое, что hit_rate
                      при held-out размере 1 — здесь оставлены оба ради явности
                      в отчёте, чтобы на собеседовании не путать их с общим
                      случаем (recall@k при >1 релевантном айтеме).
        hit_rate@k  = доля пользователей, для которых held-out item попал в top-K
        """
        hits = 0
        precisions = []
        n_eval = 0

        for user_id, group in interactions_df.groupby("user_id"):
            group = group.sort_values("joined_at")
            if len(group) < 2:
                continue
            *history, held_out = group["content_id"].tolist()
            if held_out not in self._content_id_to_idx:
                continue

            recs = self.recommend_for_user(history, k=k)
            rec_ids = {r["content_id"] for r in recs}

            hit = held_out in rec_ids
            hits += int(hit)
            precisions.append((1 if hit else 0) / k)
            n_eval += 1

        if n_eval == 0:
            return EvalMetrics(precision_at_k=0.0, recall_at_k=0.0, hit_rate_at_k=0.0, k=k, n_eval_users=0)

        return EvalMetrics(
            precision_at_k=round(float(np.mean(precisions)), 4),
            recall_at_k=round(hits / n_eval, 4),
            hit_rate_at_k=round(hits / n_eval, 4),
            k=k,
            n_eval_users=n_eval,
        )
