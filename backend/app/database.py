from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.config import settings
import logging
import json as json_module

logger = logging.getLogger(__name__)

# Compute final database URL (respects DATABASE_URL_DIRECT override)
database_url = settings.SQLALCHEMY_DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)

# Log the database endpoint being used (without password)
if database_url:
    url_for_logging = database_url.split("@")[-1] if "@" in database_url else "<redacted>"
    if "pooler.supabase.com" in url_for_logging:
        logger.info(f"Database: Using Supabase pgBouncer pooler endpoint")
    elif "db.supabase.com" in url_for_logging:
        logger.info(f"Database: Using Supabase direct connection")
    else:
        logger.info(f"Database: {url_for_logging}")

# Ensure SSL for hosted Postgres (Render/Supabase)
if database_url:
    if "?" in database_url:
        if "sslmode=" not in database_url:
            database_url += "&sslmode=require"
    else:
        database_url += "?sslmode=require"

engine = None
SessionLocal = None

if database_url:
    # psycopg3 async dialect works well with PgBouncer; let PgBouncer handle pooling
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        poolclass=NullPool,
        connect_args={
            # Keep a conservative timeout; psycopg uses "connect_timeout" in seconds
            "connect_timeout": 10,
        },
    )
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    if not SessionLocal:
        raise RuntimeError("Database engine not initialized. Set DATABASE_URL environment variable.")
    async with SessionLocal() as session:
        yield session
