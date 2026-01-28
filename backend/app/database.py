from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.config import settings
import json as json_module

# Get database URL and convert to asyncpg format
database_url = settings.DATABASE_URL or ""
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = None
SessionLocal = None

if database_url:
    # NOTE: Use NullPool with Supabase because:
    # 1. The connection pooling is done by the database itself
    # 2. SQLAlchemy should NOT cache prepared statements across pooled connections
    # 3. This avoids DuplicatePreparedStatementError with pgBouncer
    #
    # If using pgBouncer pooler endpoint (pooler.supabase.com), set:
    #   DATABASE_URL=postgresql+asyncpg://user:pass@pooler.supabase.com:6543/postgres?sslmode=require
    # If using direct connection (db.supabase.com - RECOMMENDED):
    #   DATABASE_URL=postgresql+asyncpg://user:pass@db.supabase.com:5432/postgres?sslmode=require
    #
    # Direct connection is recommended because:
    # - Supports prepared statements natively
    # - Better performance for async workloads
    # - No pgBouncer quirks
    
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        poolclass=NullPool,  # Let Supabase handle connection pooling
        connect_args={
            "command_timeout": 10,
        },
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
