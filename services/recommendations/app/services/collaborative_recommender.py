"""
Collaborative filtering рекомендатель на матричной факторизации (TruncatedSVD).

В отличие от app/services/recommender.py (content-based, TF-IDF по жанрам
и описанию) — этот класс вообще не смотрит на то, ЧТО за фильм. Единственный
вход — кто что посмотрел (interactions_df: user_id, content_id, joined_at).
Модель раскладывает разреженную матрицу "пользователь × фильм" на две
маленькие матрицы латентных факторов (по умолчанию 50 чисел на пользователя
и 50 на фильм) так, чтобы скалярное произведение факторов пользователя и
фильма приближало факт "пользователь смотрел этот фильм". Похожесть выводится
из статистики поведения тысяч людей, а не из текста.

Почему это должно работать лучше content-based именно на MovieLens — см.
README сервиса, раздел "Метрики на MovieLens": там честная история, почему
TF-IDF там — заведомо слабый baseline, а этот датасет — классический
бенчмарк ИМЕННО для collaborative filtering.

Почему TruncatedSVD (sklearn), а не implicit.ALS
--------------------------------------------------
`implicit` — стандартный инструмент индустрии для implicit-feedback ALS
(правильно взвешивает "уверенность" через confidence-формулу Hu-Koren-
Volinsky), но это C-расширение, которое на Windows иногда не ставится с
первого раза без компилятора. TruncatedSVD уже есть в scikit-learn (та же
библиотека, что уже стоит для TF-IDF) — ноль новых зависимостей, ноль риска
для установки. Это классическая матричная факторизация (тот самый подход,
что прославился на Netflix Prize) — чуть менее продвинутая, чем правильный
implicit ALS с confidence-взвешиванием, но абсолютно легитимный collaborative
filtering baseline. Переход на implicit.ALS — понятный следующий шаг,
если понадобится выжать больше (см. roadmap).

Важно про leave-one-out и утечку данных: модель обучается ОДИН раз на
тренировочной матрице, из которой уже удалён "спрятанный" (held-out)
просмотр каждого оцениваемого пользователя — ДО обучения, не после.
Если бы мы обучили модель на ВСЕХ данных, а потом прятали bInteraction
только на этапе проверки — модель бы уже видела ответ во время обучения
через выученный вектор пользователя (классическая утечка данных в
рекомендательных системах).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD

from app.services.recommender import EvalMetrics  # тот же класс метрик, для честного сравнения


@dataclass
class CollaborativeRecommender:
    k_default: int = 10
    n_factors: int = 50

    _user_factors: np.ndarray | None = field(default=None, init=False, repr=False)
    _item_factors: np.ndarray | None = field(default=None, init=False, repr=False)  # (n_factors, n_items)
    _user_id_to_idx: dict[int, int] = field(default_factory=dict, init=False, repr=False)
    _content_id_to_idx: dict[int, int] = field(default_factory=dict, init=False, repr=False)
    _content_df: pd.DataFrame | None = field(default=None, init=False, repr=False)
    _popularity: pd.Series | None = field(default=None, init=False, repr=False)
    trained_at: datetime | None = field(default=None, init=False)

    def _build_matrix(self, interactions_df: pd.DataFrame) -> csr_matrix:
        rows = [self._user_id_to_idx[u] for u in interactions_df["user_id"]]
        cols = [self._content_id_to_idx[c] for c in interactions_df["content_id"] if c in self._content_id_to_idx]
        # (rows/cols должны быть той же длины — фильтруем пары синхронно)
        pairs = [
            (self._user_id_to_idx[u], self._content_id_to_idx[c])
            for u, c in zip(interactions_df["user_id"], interactions_df["content_id"])
            if c in self._content_id_to_idx
        ]
        r = [p[0] for p in pairs]
        c = [p[1] for p in pairs]
        data = np.ones(len(pairs))
        return csr_matrix((data, (r, c)), shape=(len(self._user_id_to_idx), len(self._content_id_to_idx)))

    def fit(self, content_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "CollaborativeRecommender":
        """
        content_df: columns [content_id, title, genres] — нужен ТОЛЬКО для
        красивого вывода (title/genres в ответе API), сама модель их не видит.
        interactions_df: columns [user_id, content_id, joined_at].
        """
        content_df = content_df.reset_index(drop=True)
        self._content_df = content_df
        self._content_id_to_idx = {cid: i for i, cid in enumerate(content_df["content_id"])}
        self._user_id_to_idx = {uid: i for i, uid in enumerate(sorted(interactions_df["user_id"].unique()))}

        matrix = self._build_matrix(interactions_df)

        n_factors = min(self.n_factors, min(matrix.shape) - 1)
        svd = TruncatedSVD(n_components=n_factors, random_state=42)
        self._user_factors = svd.fit_transform(matrix)  # (n_users, n_factors)
        self._item_factors = svd.components_  # (n_factors, n_items)

        self._popularity = (
            interactions_df.groupby("content_id")["user_id"].nunique().sort_values(ascending=False)
        )
        self.trained_at = datetime.now(timezone.utc)
        return self

    def most_popular(self, k: int | None = None, exclude: set[int] | None = None) -> list[dict]:
        k = k or self.k_default
        exclude = exclude or set()
        assert self._popularity is not None

        ranked = [cid for cid in self._popularity.index if cid not in exclude][:k]
        return [self._as_item(cid, score=float(self._popularity.loc[cid]), reason="popular_fallback") for cid in ranked]

    def recommend_for_user_id(
        self, user_id: int, k: int | None = None, watched: set[int] | None = None
    ) -> list[dict]:
        """
        В отличие от content-based recommend_for_user(), тут нужен именно
        user_id, а не список просмотренного — латентный вектор пользователя
        выучен во время fit() и его нельзя восстановить постфактум из
        произвольного списка айтемов (в отличие от TF-IDF-профиля, который
        считается на лету как среднее векторов). Это и есть та самая
        "cold start" проблема collaborative filtering — см. README/план
        проекта: для пользователя, которого не было при обучении,
        единственный вариант — cold-start fallback (popularity или
        content-based).
        """
        k = k or self.k_default
        watched = watched or set()

        if user_id not in self._user_id_to_idx:
            return self.most_popular(k=k, exclude=watched)

        u_idx = self._user_id_to_idx[user_id]
        scores = self._user_factors[u_idx] @ self._item_factors  # (n_items,)

        watched_idxs = [self._content_id_to_idx[c] for c in watched if c in self._content_id_to_idx]
        scores = scores.copy()
        scores[watched_idxs] = -np.inf

        order = np.argsort(-scores)[:k]
        idx_to_content_id = {i: cid for cid, i in self._content_id_to_idx.items()}
        return [
            self._as_item(idx_to_content_id[idx], score=float(scores[idx]), reason="collaborative")
            for idx in order
            if scores[idx] > -np.inf
        ]

    def is_known_user(self, user_id: int) -> bool:
        """
        Был ли этот user_id в обучающих данных — то есть можно ли доверять
        его латентному вектору, или пора падать в cold-start fallback
        (content-based/popularity). Роутер (app/routers/recommendations.py)
        обращается к этому методу, а не напрямую к _user_id_to_idx —
        приватные атрибуты наружу не торчат.
        """
        return user_id in self._user_id_to_idx

    def _as_item(self, content_id: int, score: float, reason: str) -> dict:
        row = self._content_df.iloc[self._content_id_to_idx[content_id]]
        release_year = row.get("release_year")
        return {
            "content_id": int(content_id),
            "title": row["title"],
            "genres": row["genres"] if isinstance(row["genres"], list) else [],
            "score": round(score, 4),
            "reason": reason,
            # .get() — content_df здесь обучается на MovieLens (train_collaborative.py),
            # этих колонок нет; оставлено для совместимости формата ответа с
            # ContentRecommender._as_item(), CF на реальном каталоге не деплоится.
            "poster_path": row.get("poster_path") or None,
            "release_year": None if pd.isna(release_year) else int(release_year),
        }

    def evaluate_leave_one_out(self, interactions_df: pd.DataFrame, k: int = 10) -> EvalMetrics:
        """
        Тот же протокол, что и у content-based ContentRecommender.evaluate_leave_one_out
        (см. app/services/recommender.py) — чтобы цифры были сравнимы один в один.

        Важное отличие в реализации: для CF нельзя просто "спрятать" айтем
        на этапе оценки, как для content-based (там профиль строится на
        лету из истории). Здесь held-out интеракции нужно убрать из
        тренировочной матрицы ДО обучения — иначе выученный вектор
        пользователя уже "видел" ответ. Поэтому здесь отдельный метод, а
        не переиспользование fit() — он обучает СВОЮ временную модель на
        урезанных данных, не трогая self._user_factors/self._item_factors
        (те, что использует recommend_for_user_id() в проде/API, обучены
        на ВСЕХ данных, без искусственного дырявания).
        """
        eligible = []
        train_rows = []

        for user_id, group in interactions_df.groupby("user_id"):
            group = group.sort_values("joined_at")
            if len(group) < 2:
                continue
            *history, held_out = group["content_id"].tolist()
            if held_out not in self._content_id_to_idx:
                continue
            eligible.append((user_id, history, held_out))
            for c in history:
                if c in self._content_id_to_idx:
                    train_rows.append((user_id, c))

        if not eligible:
            return EvalMetrics(precision_at_k=0.0, recall_at_k=0.0, hit_rate_at_k=0.0, k=k, n_eval_users=0)

        user_ids = sorted(interactions_df["user_id"].unique())
        uid_to_idx = {u: i for i, u in enumerate(user_ids)}

        r = [uid_to_idx[u] for u, c in train_rows]
        c_ = [self._content_id_to_idx[c] for u, c in train_rows]
        train_matrix = csr_matrix(
            (np.ones(len(train_rows)), (r, c_)), shape=(len(user_ids), len(self._content_id_to_idx))
        )

        n_factors = min(self.n_factors, min(train_matrix.shape) - 1)
        svd = TruncatedSVD(n_components=n_factors, random_state=42)
        eval_user_factors = svd.fit_transform(train_matrix)
        eval_item_factors = svd.components_

        scores_matrix = eval_user_factors @ eval_item_factors  # (n_users, n_items)

        hits = 0
        precisions = []
        n_eval = 0

        for user_id, history, held_out in eligible:
            u_idx = uid_to_idx[user_id]
            row_scores = scores_matrix[u_idx].copy()
            watched_idxs = [self._content_id_to_idx[c] for c in history if c in self._content_id_to_idx]
            row_scores[watched_idxs] = -np.inf

            top_k = set(np.argsort(-row_scores)[:k].tolist())
            held_idx = self._content_id_to_idx[held_out]

            hit = held_idx in top_k
            hits += int(hit)
            precisions.append((1 if hit else 0) / k)
            n_eval += 1

        return EvalMetrics(
            precision_at_k=round(float(np.mean(precisions)), 4),
            recall_at_k=round(hits / n_eval, 4),
            hit_rate_at_k=round(hits / n_eval, 4),
            k=k,
            n_eval_users=n_eval,
        )
