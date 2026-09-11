"""
Обогащение MovieLens (ml-latest-small) реальными описаниями сюжета из TMDB.

Зачем: у MovieLens есть только title + genres, из-за чего content-based
рекомендатель (TF-IDF по тексту) видит десятки фильмов с одинаковым набором
жанров как почти одинаковые — сигнала мало, метрики (hit_rate@10) едва лучше
случайного (см. README, раздел "Метрики"). MovieLens сам даёт связку
movieId -> tmdbId в links.csv — можно дотянуть overview из того же TMDB API,
который мы уже используем для каталога CoWatch, и пересчитать.

Запуск (нужен TMDB_API_KEY в .env, и распакованный ml-latest-small):
    cd services/recommendations
    python -m ml.enrich_movielens --data-dir data/movielens/ml-latest-small

Результат: data/movielens/ml-latest-small/movies_enriched.csv
(movieId, title, genres, overview) — train.py подхватывает его сам,
если файл существует, вместо голых genres из movies.csv.

Не все tmdbId из links.csv валидны (бывают 404 — устаревшие/битые id в самом
датасете), это нормально: такие строки остаются без overview, но не роняют
весь прогон.
"""
import argparse
import asyncio
from pathlib import Path

import pandas as pd

from app.services.tmdb_client import TMDBClient

# Ограничиваем количество одновременных запросов к TMDB, чтобы не словить
# rate-limit на ~9700 фильмах — не "сколько успеем", а по очереди пачками.
_CONCURRENCY = 8


async def _fetch_one(client: TMDBClient, sem: asyncio.Semaphore, tmdb_id: int) -> str:
    async with sem:
        try:
            details = await client.fetch_movie_details(tmdb_id)
        except Exception:
            return ""
        return (details or {}).get("overview") or ""


async def enrich(data_dir: Path) -> None:
    client = TMDBClient()
    if not client.enabled:
        raise SystemExit("TMDB_API_KEY не задан — обогащение невозможно (см. .env).")

    movies = pd.read_csv(data_dir / "movies.csv")
    links = pd.read_csv(data_dir / "links.csv")

    merged = movies.merge(links[["movieId", "tmdbId"]], on="movieId", how="left")

    sem = asyncio.Semaphore(_CONCURRENCY)
    overviews: list[str] = [""] * len(merged)
    total = len(merged)
    fetched = 0
    missing_id = 0

    for start in range(0, total, _CONCURRENCY * 5):
        chunk = merged.iloc[start : start + _CONCURRENCY * 5]
        tasks = []
        idxs = []
        for i, row in chunk.iterrows():
            tmdb_id = row["tmdbId"]
            if pd.isna(tmdb_id):
                missing_id += 1
                continue
            tasks.append(_fetch_one(client, sem, int(tmdb_id)))
            idxs.append(i)

        results = await asyncio.gather(*tasks)
        for idx, overview in zip(idxs, results):
            overviews[idx] = overview
        fetched += len(tasks)
        print(f"{min(start + _CONCURRENCY * 5, total)}/{total} обработано...")

    merged["overview"] = overviews
    got_overview = sum(1 for o in overviews if o)

    out = merged[["movieId", "title", "genres", "overview"]]
    out_path = data_dir / "movies_enriched.csv"
    out.to_csv(out_path, index=False)

    print(f"Готово: {out_path}")
    print(f"Фильмов всего: {total}, без tmdbId в links.csv: {missing_id}, реально получили overview: {got_overview}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=str, required=True, help="Папка с movies.csv/links.csv (ml-latest-small)")
    args = parser.parse_args()
    asyncio.run(enrich(Path(args.data_dir)))


if __name__ == "__main__":
    main()
