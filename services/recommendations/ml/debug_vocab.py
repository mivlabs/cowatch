"""
Разовый диагностический скрипт (v2, исправлено): используем ТУ ЖЕ САМУЮ
модель ContentRecommender, что и train.py — а не свою отдельную копию
TfidfVectorizer с захардкоженными параметрами (как было в первой версии
этого скрипта, из-за чего он не видел изменения max_df/min_df в
recommender.py).

Запуск:
    cd services/recommendations
    python -m ml.debug_vocab
"""
from pathlib import Path

from app.services.recommender import ContentRecommender
from ml.train import load_movielens

DATA_DIR = Path("data/movielens/ml-latest-small")

genre_words = {"action", "adventure", "animation", "children", "comedy",
               "crime", "documentary", "drama", "fantasy", "film", "noir",
               "horror", "musical", "mystery", "romance", "sci", "fi",
               "thriller", "war", "western", "imax"}


def main():
    content_df, interactions_df = load_movielens(DATA_DIR)

    model = ContentRecommender(k_default=10)
    model.fit(content_df, interactions_df)

    vec = model.vectorizer
    print(f"Параметры реального vectorizer: max_features={vec.max_features}, "
          f"min_df={vec.min_df}, max_df={vec.max_df}")

    vocab = vec.get_feature_names_out()
    print(f"Размер итогового словаря: {len(vocab)}")

    genre_in_vocab = [w for w in vocab if w.lower() in genre_words]
    print(f"Жанровых слов в словаре: {len(genre_in_vocab)} -> {genre_in_vocab}")

    nnz_per_row = model._item_matrix
    import numpy as np
    nnz = (nnz_per_row != 0).sum(axis=1)
    print(f"Среднее число ненулевых признаков на фильм: {nnz.mean():.2f}")


if __name__ == "__main__":
    main()
