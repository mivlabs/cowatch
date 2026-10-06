"""
Нормализация строки подключения к Postgres под SQLAlchemy async (asyncpg).

Railway отдаёт публичный connection string как
postgresql://user:pass@host:port/db (psycopg-стиль). SQLAlchemy async
нужен драйвер asyncpg: postgresql+asyncpg://... . sslmode=... в query
string — синтаксис psycopg2, asyncpg его не понимает и падает на
подключении, поэтому вырезаем (публичный прокси Railway не требует
отдельного управления TLS через этот параметр).
"""
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def to_asyncpg_url(raw_url: str) -> str:
    parts = urlsplit(raw_url)
    scheme = parts.scheme
    if scheme == "postgres":
        scheme = "postgresql"
    if "+asyncpg" not in scheme:
        scheme = scheme.replace("postgresql", "postgresql+asyncpg", 1)

    query_pairs = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() != "sslmode"]
    query = urlencode(query_pairs)

    return urlunsplit((scheme, parts.netloc, parts.path, query, parts.fragment))
