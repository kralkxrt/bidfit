from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.config import settings
import logging
import json as json_module

logger = logging.getLogger(__name__)

# Modify the URL for asyncpg if it doesn't already have it
database_url = settings.DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Log the database endpoint being used (without password)
if database_url:
    url_for_logging = database_url.split("@")[-1] if "@" in database_url else "<redacted>"
    if "pooler.supabase.com" in url_for_logging:
        logger.info(f"Database: Using Supabase pgBouncer pooler endpoint")
    elif "db.supabase.com" in url_for_logging:
        logger.info(f"Database: Using Supabase direct connection")
    else:
        logger.info(f"Database: {url_for_logging}")

# Add required parameters for Supabase Pooler (PgBouncer)
if database_url:
    # Remove any existing query params and rebuild
    base_url = database_url.split("?")[0]
    # Add required params: SSL + statement_cache_size=0 in URL
    # (asyncpg reads this from URL during initial connection setup)
    database_url = f"{base_url}?ssl=require&statement_cache_size=0"

engine = None
SessionLocal = None

if database_url:
    # CRITICAL: connect_args configuration for asyncpg with pgbouncer
    # statement_cache_size=0 MUST be in connect_args, not URL parameters
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        poolclass=NullPool,
        # Disable SQLAlchemy's compiled statement cache to prevent prepared statements
        # This is CRITICAL for pgBouncer compatibility
        query_cache_size=0,
        connect_args={
            "statement_cache_size": 0,  # CRITICAL: pgbouncer doesn't support prepared statements
            "command_timeout": 10,
            "server_settings": {"jit": "off"},
        },
        # Disable asyncpg JSON codec to prevent prepared statement registration
        json_serializer=json_module.dumps,
        json_deserializer=json_module.loads,
    )
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    if not SessionLocal:
        raise RuntimeError("Database engine not initialized. Set DATABASE_URL environment variable.")
    async with SessionLocal() as session:
        yield session
