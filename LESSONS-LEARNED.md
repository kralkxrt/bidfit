# Lessons Learned

## 2026-01-11 - Project Setup
**Issue**: `shadcn-ui` package is deprecated.
**Root Cause**: The package was renamed to `shadcn`.
**Solution**: Used `npx shadcn@latest init` instead of `shadcn-ui`.
**Prevention**: Use the new package name in future commands.

## 2026-01-11 - Environment
**Issue**: Python 3.11 not found.
**Root Cause**: System uses Python 3.9.6.
**Solution**: Proceeded with Python 3.9. Note: Python 3.11+ is preferred for production due to better async performance and typing features.
**Prevention**: Ensure target environment has Python 3.11+ if possible, or verify compatibility.

## 2026-01-11 - Database
**Issue**: Docker not available in Antigravity IDE.
**Root Cause**: Agent environment restrictions.
**Solution**: Use managed DB services (Supabase/Neon) instead of local containers.
**Prevention**: Default to managed services for database infrastructure in this environment.

## 2026-01-11 - MVP Mode
MVP MODE: Skipping Clerk auth. Single hardcoded user seeded to DB, multi-company via dropdown. Agent runs all DB operations via transaction pooler.
