"""
Разовый диагностический скрипт (v3, быстрый): один матричный проход вместо
610 отдельных вызовов cosine_similarity (которые каждый раз пересчитывали
нормализацию всей матрицы каталога заново — вот что реально тормозило).

Запуск:
    cd services/recommendations
    python -m ml.debug_eval
"""
from pathlib import Path

import numpy as np

from app.services.recommender import ContentRecommender
from ml.train import load_movielens

DATA_DIR = Path("data/movielens/ml-latest-small")


def main():
    print("Загружаю данные...")
    content_df, interactions_df = load_movielens(DATA_DIR)

    print("Обучаю TF-IDF...")
    model = ContentRecommender(k_default=10)
    model.fit(content_df, interactions_df)

    item_matrix = model._item_matrix  # (n_items, n_features), уже dense
    item_norms = np.linalg.norm(item_matrix, axis=1, keepdims=True)
    item_norms[item_norms == 0] = 1e-10
    item_unit = item_matrix / item_norms  # нормализуем ОДИН раз

    print("Строю профили пользователей...")
    profiles = []
    held_out_idxs = []
    n_features = item_matrix.shape[1]

    for user_id, group in interactions_df.groupby("user_id"):
        group = group.sort_values("joined_at")
        if len(group) < 2:
            continue
        *history, held_out = group["content_id"].tolist()
        if held_out not in model._content_id_to_idx:
            continue

        idxs = [model._content_id_to_idx[c] for c in history if c in model._content_id_to_idx]
        if not idxs:
            continue

        profiles.append(item_matrix[idxs].mean(axis=0))
        held_out_idxs.append(model._content_id_to_idx[held_out])

    profiles = np.vstack(profiles)  # (n_eval, n_features)
    profile_norms = np.linalg.norm(profiles, axis=1, keepdims=True)
    profile_norms[profile_norms == 0] = 1e-10
    profiles_unit = profiles / profile_norms

    print(f"Считаю схожесть для {len(profiles)} пользователей одним умножением матриц...")
    sims_matrix = profiles_unit @ item_unit.T  # (n_eval, n_items) — один быстрый шаг

    max_sims = sims_matrix.max(axis=1)
    positive_counts = (sims_matrix > 0).sum(axis=1)

    held_out_ranks = []
    for row, ho_idx in zip(sims_matrix, held_out_idxs):
        rank = int((row > row[ho_idx]).sum())
        held_out_ranks.append(rank)

    n_eval = len(profiles)
    print(f"\nОценили пользователей: {n_eval}")
    print(f"Средняя максимальная близость профиль->каталог: {max_sims.mean():.4f}")
    print(f"Медианная максимальная близость: {np.median(max_sims):.4f}")
    print(f"Среднее число айтемов с sims > 0 (из {item_matrix.shape[0]}): {positive_counts.mean():.1f}")
    print(f"Медиана айтемов с sims > 0: {np.median(positive_counts):.1f}")
    print(f"\nСреднее место held-out айтема в ранжировании (0 = топ-1): {np.mean(held_out_ranks):.0f}")
    print(f"Медианное место held-out айтема: {np.median(held_out_ranks):.0f}")
    print(f"Доля случаев, когда held-out попал в топ-10: "
          f"{sum(1 for r in held_out_ranks if r < 10) / len(held_out_ranks):.2%}")


if __name__ == "__main__":
    main()
