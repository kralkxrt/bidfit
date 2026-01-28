# BidWin Agent Instructions

## MANDATORY VERIFICATION RULE

**Before reporting ANY task as complete, you MUST run the verification script:**

```bash
bash verify-before-done.sh
```

This script:
1. Kills old processes (prevents port conflicts)
2. Clears caches (prevents stale build issues)
3. Runs lint (catches code errors)
4. Runs build (catches TypeScript/compilation errors)
5. Checks backend health
6. Starts frontend and verifies it loads
7. Tests key pages respond

## IF VERIFICATION FAILS

**DO NOT report your task as done.**

1. Read the error messages
2. Fix the issues
3. Run verification again
4. Only report done when ALL CHECKS PASS

## COMMON ISSUES AND FIXES

### Port already in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Build fails with module error
```bash
rm -rf frontend/.next
rm -rf frontend/node_modules/.cache
npm --prefix frontend install
```

### TypeScript errors
- Check the file mentioned in the error
- Ensure all imports exist
- Ensure all types are correct
- Run `npm --prefix frontend run build` to see full error

### Lint errors
- Run `npm --prefix frontend run lint` to see issues
- Fix unused imports, missing deps, etc.

### Backend not running
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend not responding
```bash
pkill -f "next"
rm -rf frontend/.next
npm --prefix frontend run dev
```

## FILE LOCATIONS

- Verification script: `verify-before-done.sh` (project root)
- Frontend: `frontend/`
- Backend: `backend/`
- Components: `frontend/src/components/`
- Pages: `frontend/src/app/`

## QUALITY STANDARDS

### Before ANY code change:
1. Understand what file(s) you're modifying
2. Check if the file has `'use client'` if it needs interactivity
3. Ensure imports are correct

### After ANY code change:
1. Run `npm --prefix frontend run lint`
2. Run `npm --prefix frontend run build`
3. If both pass, run full verification script

### When adding new features:
1. Create backend endpoint first (if needed)
2. Test endpoint with curl
3. Create frontend component
4. Run verification
5. Only then report done

## NEVER DO THESE THINGS

- ❌ Report done without running verification
- ❌ Leave multiple Next.js instances running
- ❌ Skip the build step
- ❌ Ignore TypeScript errors
- ❌ Modify files without testing the result
