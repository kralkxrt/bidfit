import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.config import settings
from app.database import engine, Base
from app.api.routes import companies, documents, opportunities, analyses, roxy, profile, dashboard, company_profile, past_performance, compliance_matrix

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 60)
    logger.info("Starting application...")
    
    # Validate required environment variables
    missing_vars = []
    if not settings.DATABASE_URL:
        missing_vars.append("DATABASE_URL")
    if not settings.ANTHROPIC_API_KEY:
        missing_vars.append("ANTHROPIC_API_KEY")
    if not settings.OPENAI_API_KEY:
        missing_vars.append("OPENAI_API_KEY")
    
    if missing_vars:
        logger.error(f"CRITICAL: Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Application cannot start without these variables.")
        raise RuntimeError(f"Missing required env vars: {', '.join(missing_vars)}")
    
    # Initialize database
    if engine:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✓ Database initialized successfully")
        except Exception as e:
            logger.error(f"✗ Database initialization error: {e}", exc_info=True)
            raise
    else:
        logger.error("✗ Database engine not configured")
        raise RuntimeError("Database engine not initialized")
    
    logger.info("=" * 60)
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    if engine:
        await engine.dispose()
        logger.info("✓ Database connection pool closed")
    logger.info("=" * 60)

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan
)

import os

# CORS
# Allow local dev on any localhost port + optionally a production frontend URL.
# (In local dev, Next may auto-increment ports if 3000 is in use.)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred. Please try again later."},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Include Routers
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(opportunities.router) # Prefix defined in router
app.include_router(compliance_matrix.router)
app.include_router(analyses.router)
app.include_router(roxy.router)
app.include_router(profile.router)
app.include_router(company_profile.router)
app.include_router(past_performance.router)
app.include_router(dashboard.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health_check():
    return {"status": "ok"}


@app.get("/api/health/db")
async def db_health_check():
    """Check database connectivity."""
    if not engine:
        return {"status": "error", "message": "Database not configured"}
    
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
