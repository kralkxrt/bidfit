from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from sqlalchemy import event
from app.config import settings
import json as json_module

# Modify the URL for asyncpg if it doesn't already have it
database_url = settings.DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Add required parameters for Supabase Pooler (PgBouncer)
if database_url:
    # Remove any existing query params and rebuild
    base_url = database_url.split("?")[0]
    # Add all required params: SSL + disable prepared statements in URL
    # PgBouncer in transaction/statement mode doesn't support prepared statements
    database_url = f"{base_url}?ssl=require&statement_cache_size=0"

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
            "server_settings": {
                "jit": "off",  # Disable JIT to avoid prepared statement issues
            },
        },
        # Bypass asyncpg JSON codec setup to avoid DuplicatePreparedStatementError with pgbouncer
        # Use standard json serialization/deserialization instead
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
