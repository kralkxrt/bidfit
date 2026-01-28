from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.config import settings

# Modify the URL for asyncpg if it doesn't already have it
database_url = settings.DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Add required parameters for Supabase Pooler (PgBouncer)
if database_url:
    # Remove any existing query params and rebuild
    base_url = database_url.split("?")[0]
    # Add all required params: SSL + disable prepared statements
    database_url = f"{base_url}?ssl=require&prepared_statement_cache_size=0"

engine = None
SessionLocal = None

if database_url:
    # CRITICAL: connect_args configuration for asyncpg
    # - statement_cache_size=0: REQUIRED for pgbouncer compatibility (Supabase default)
    # - command_timeout: Prevent hanging connections
    # - server_settings: Disable JIT to avoid prepared statement conflicts
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,  # CRITICAL: pgbouncer doesn't support prepared statements
            "command_timeout": 10,  # Prevent hanging connections
            "server_settings": {"jit": "off"},  # Disable JIT to reduce prepared statement issues
        }
    )
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    if not SessionLocal:
        raise RuntimeError("Database engine not initialized. Set DATABASE_URL environment variable.")
    async with SessionLocal() as session:
        yield session
