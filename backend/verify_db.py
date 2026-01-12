import asyncio
import os
import asyncpg
from dotenv import load_dotenv

# Load env from .env file explicitly
load_dotenv(".env")
database_url = os.getenv("DATABASE_URL")

async def verify_tables():
    # Convert sqlalchemy url to asyncpg if needed (or just use psycopg2 string if compatible)
    # The URL in .env is: postgresql://...:6543/postgres which works with asyncpg usually
    
    # We might need to ensure ssl is handled. Supabase requires SSL.
    # asyncpg usually requires explicit ssl='require' if not in URL parameters.
    
    print(f"Connecting to {database_url.split('@')[1] if '@' in database_url else 'DB'}...")
    try:
        conn = await asyncpg.connect(database_url.replace("postgresql://", "postgresql://"))
        
        tables = [
            "users", "companies", "user_companies", "documents", 
            "opportunities", "opportunity_documents", "analyses", "audit_logs"
        ]
        
        print("\nVerifying tables:")
        all_exist = True
        for table in tables:
            exists = await conn.fetchval(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", 
                table
            )
            status = "✅ Found" if exists else "❌ MISSING"
            print(f"- {table}: {status}")
            if not exists:
                all_exist = False
        
        # Check extensions
        print("\nVerifying extensions:")
        extensions = ["vector", "uuid-ossp"]
        for ext in extensions:
            exists = await conn.fetchval(
                "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = $1)",
                ext
            )
            status = "✅ Enabled" if exists else "❌ MISSING"
            print(f"- {ext}: {status}")

        if all_exist:
            print("\n🎉 SUCCESS: All tables and extensions verified!")
        else:
            print("\n⚠️ WARNING: Some tables or extensions are missing.")
            
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(verify_tables())
