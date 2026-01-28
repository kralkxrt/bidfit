from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Modify the URL for asyncpg if it doesn't already have it
database_url = settings.DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Add SSL requirement for Supabase connections
if database_url and "?" not in database_url:
    database_url += "?ssl=require"
elif database_url and "ssl" not in database_url:
    database_url += "&ssl=require"

engine = None
SessionLocal = None

if database_url:
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        # CRITICAL: Disable statement caching for PgBouncer compatibility
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }
    )
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    if not SessionLocal:
        raise RuntimeError("Database engine not initialized. Set DATABASE_URL environment variable.")
    async with SessionLocal() as session:
        yield session
