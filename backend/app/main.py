from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import companies, documents, opportunities, analyses

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

import os

# CORS
# Allow localhost:3000 and the production frontend URL
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(opportunities.router) # Prefix defined in router
app.include_router(analyses.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
