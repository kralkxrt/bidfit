from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from app.config import settings

# Modify the URL for asyncpg if it doesn't already have it
database_url = settings.DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Add required parameters for Supabase Pooler (PgBouncer)
if database_url:
    # Remove any existing query params and rebuild
    base_url = database_url.split("?")[0]
    # Add all required params: SSL + disable prepared statements in URL
    database_url = f"{base_url}?ssl=require"

engine = None
SessionLocal = None

if database_url:
    # CRITICAL: Use QueuePool (not NullPool) with pgbouncer
    # pgbouncer handles connection pooling; we just need a small local pool
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        poolclass=QueuePool,
        pool_size=5,  # Small pool since pgbouncer handles the heavy lifting
        max_overflow=0,  # Don't exceed pool_size
        pool_pre_ping=True,  # Verify connections before use
        connect_args={
            "statement_cache_size": 0,  # pgbouncer doesn't preserve prepared statements
            "command_timeout": 10,
        }
    )
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    if not SessionLocal:
        raise RuntimeError("Database engine not initialized. Set DATABASE_URL environment variable.")
    async with SessionLocal() as session:
        yield session
