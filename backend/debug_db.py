import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Need settings
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.config import settings

async def test_direct_connection():
    print(f"\n--- Testing Connection (Direct Port 5432) ---")
    
    # Construct Direct URL
    # current: postgresql://postgres.oaujtwtmvjqhuoohrfkl:HEJcHWS5d3Jsixpc@aws-1-us-east-1.pooler.supabase.com:6543/postgres
    # direct: postgresql+asyncpg://postgres.oaujtwtmvjqhuoohrfkl:HEJcHWS5d3Jsixpc@db.oaujtwtmvjqhuoohrfkl.supabase.co:5432/postgres
    
    # Extract credentials
    original_url = settings.DATABASE_URL
    user_pass = original_url.split("@")[0].split("//")[1]
    project_ref = user_pass.split(".")[0] # 'postgres.oaujtwtmvjqhuoohrfkl' -> 'postgres' no, it's 'postgres.oas...'
    # Wait, user is 'postgres.oaujtwtmvjqhuoohrfkl'
    
    # Let's just hardcode based on known format
    # user: postgres.oaujtwtmvjqhuoohrfkl
    # pass: HEJcHWS5d3Jsixpc
    # host: db.oaujtwtmvjqhuoohrfkl.supabase.co
    
    direct_url = "postgresql+asyncpg://postgres.oaujtwtmvjqhuoohrfkl:HEJcHWS5d3Jsixpc@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
    
    print(f"URL: {direct_url.split('@')[1]}") # hide pass
    
    engine = create_async_engine(direct_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            print("Connected to Direct DB. Running query...")
            result = await conn.execute(text("SELECT 1"))
            print(f"Result: {result.scalar()}")
            
        print("✅ Success!")
    except Exception as e:
        print(f"❌ Failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_direct_connection())
