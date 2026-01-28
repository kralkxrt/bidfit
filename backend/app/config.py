"""
Application configuration using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "PP Gap Analysis"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL or ""
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Supabase (New)
    SUPABASE_URL: Optional[str] = ""
    SUPABASE_SERVICE_KEY: Optional[str] = ""
    
    # Authentication
    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Claude API
    ANTHROPIC_API_KEY: Optional[str] = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    CLAUDE_MAX_TOKENS: int = 4096

    
    # OpenAI (for embeddings)
    OPENAI_API_KEY: Optional[str] = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Storage
    S3_BUCKET_NAME: str = "documents"
    S3_ACCESS_KEY: str = "placeholder"
    S3_SECRET_KEY: str = "placeholder"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_REGION: str = "us-east-1"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Background Tasks
    REDIS_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
