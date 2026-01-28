# Critical: Update DATABASE_URL in Render

## The Root Cause
You were using Supabase's **pgBouncer pooler endpoint** which doesn't support prepared statements across connection boundaries. This caused `DuplicatePreparedStatementError`.

## The Solution
Switch to Supabase's **direct connection endpoint** which supports full PostgreSQL functionality.

## Steps

### 1. Get Your Direct Connection String from Supabase
- Go to Supabase Dashboard → Your Project → Settings → Database
- Look for "Connection string" section
- Copy the string that uses **db.supabase.com** (NOT pooler.supabase.com)
- Example format: `postgresql://user:password@db.supabase.com:5432/postgres`

### 2. Update DATABASE_URL in Render
- Go to Render Dashboard → bidwin-backend service
- Go to "Environment" tab
- Find `DATABASE_URL` variable
- **Replace the entire value** with the direct connection string from step 1
- The URL should contain `db.supabase.com:5432`, NOT `pooler.supabase.com:6543`
- Render will auto-redeploy when you save

### 3. Verify
After deployment completes:
```bash
curl https://bidwin-backend.onrender.com/api/health/db
```
Should return: `{"status":"ok","database":"connected"}`

## Why This Works
- Direct connection = true PostgreSQL with full prepared statement support
- NullPool = SQLAlchemy doesn't maintain its own connection pool (Supabase handles it)
- No more pgBouncer quirks = stable, predictable behavior
- Better performance for async workloads
- Can scale workers to 4+ without conflicts

## If You Need pgBouncer (you probably don't)
If you must use the pooler endpoint for some reason, you would need to keep the old database.py config. But this is NOT recommended.
