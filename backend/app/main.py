from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base
from app.api.routes import companies, documents, opportunities, analyses, roxy, profile, dashboard, company_profile, past_performance, compliance_matrix

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if engine:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("Database initialized successfully")
        except Exception as e:
            print(f"Warning: Database initialization error: {e}")
    yield
    # Shutdown
    if engine:
        await engine.dispose()
        print("Database connection pool closed")

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
