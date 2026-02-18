import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def _normalize_db_url(url: str) -> str:
    """
    Render often provides DATABASE_URL starting with 'postgres://'
    SQLAlchemy expects 'postgresql://'
    """
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

def get_engine():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is not set. Add it in Render environment variables.")
    db_url = _normalize_db_url(db_url)

    return create_engine(db_url, pool_pre_ping=True)

engine = get_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
