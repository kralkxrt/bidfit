# Deploying BidFit to Railway

## Prerequisites
- GitHub account with this repo
- Railway account (sign up at railway.app)

## Setup Steps

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub and select the `bidfit` repo

### 2. Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically creates `DATABASE_URL`

### 3. Deploy Backend Service
1. Click "New" → "GitHub Repo" → Select this repo
2. Configure:
   - **Name**: `bidfit-backend`
   - **Root Directory**: `backend`
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add Environment Variables:
   - `DATABASE_URL`: (Railway auto-links if you click "Add Reference" → PostgreSQL)
   - `ANTHROPIC_API_KEY`: your-api-key
   - `FRONTEND_URL`: (add after frontend deploys, e.g., `https://bidfit-frontend-xxx.railway.app`)
   - `JWT_SECRET_KEY`: (generate a random string)

### 4. Deploy Frontend Service
1. Click "New" → "GitHub Repo" → Select this repo
2. Configure:
   - **Name**: `bidfit-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://bidfit-backend-xxxx.railway.app` (your backend URL)

### 5. Finalize Configuration
1. **Update Backend CORS**: copy the `frontend` URL once deployed and add it to the Backend's `FRONTEND_URL` variable.
2. **Generate Domains**: Click "Settings" → "Domains" → "Generate Domain" for each service to get public URLs.

## Environment Variables Summary

### Backend
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (auto from Railway PostgreSQL) |
| `ANTHROPIC_API_KEY` | your-key |
| `FRONTEND_URL` | https://bidfit-frontend-xxx.railway.app |
| `JWT_SECRET_KEY` | random-secure-string |

### Frontend
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | https://bidfit-backend-xxx.railway.app |
