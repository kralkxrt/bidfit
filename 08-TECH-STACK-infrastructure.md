# Technology Stack & Infrastructure
## Past Performance Gap Analysis Agent

---

## 1. Stack Overview

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Frontend** | Next.js | 14.x | App Router, SSR, great DX |
| **Frontend Language** | TypeScript | 5.x | Type safety, better tooling |
| **Styling** | Tailwind CSS | 3.x | Utility-first, rapid development |
| **Components** | shadcn/ui | latest | High-quality, customizable |
| **Backend** | FastAPI | 0.109+ | Async, auto-docs, Python ecosystem |
| **Backend Language** | Python | 3.11+ | LLM libraries, data processing |
| **Database** | PostgreSQL | 15+ | Robust, pgvector support |
| **Vector Store** | pgvector | 0.5+ | Integrated with PostgreSQL |
| **LLM** | Claude API | Sonnet 4 | Best reasoning capability |
| **Embeddings** | OpenAI | text-embedding-3-small | Cost-effective, high quality |
| **File Storage** | Cloudflare R2 | - | S3-compatible, cost-effective |
| **Auth** | Clerk | - | Fast implementation, secure |
| **Deployment (FE)** | Vercel | - | Optimized for Next.js |
| **Deployment (BE)** | Railway | - | Easy Python deployment |

---

## 2. Frontend Dependencies

### package.json

```json
{
  "name": "pp-gap-analysis-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    
    "@clerk/nextjs": "^4.29.0",
    
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-query-devtools": "^5.17.0",
    
    "zustand": "^4.4.7",
    
    "react-hook-form": "^7.49.3",
    "@hookform/resolvers": "^3.3.3",
    "zod": "^3.22.4",
    
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7",
    
    "lucide-react": "^0.309.0",
    
    "react-dropzone": "^14.2.3",
    
    "date-fns": "^3.2.0",
    
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.1.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom colors for relevance scores
        relevance: {
          'very-relevant': '#22c55e',
          'relevant': '#3b82f6',
          'somewhat-relevant': '#eab308',
          'not-relevant': '#ef4444',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

---

## 3. Backend Dependencies

### requirements.txt

```
# Core Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pgvector==0.2.4

# Pydantic
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# AI/ML
anthropic==0.18.0
openai==1.10.0
tiktoken==0.5.2

# Document Processing
PyPDF2==3.0.1
python-docx==1.1.0
mammoth==1.6.0
chardet==5.2.0

# Storage
boto3==1.34.25
aioboto3==12.3.0

# Export Generation
python-docx==1.1.0
reportlab==4.0.8
jinja2==3.1.3

# HTTP Client
httpx==0.26.0
aiohttp==3.9.1

# Background Tasks
celery==5.3.4
redis==5.0.1

# Utilities
python-dateutil==2.8.2
orjson==3.9.10

# Development
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
black==24.1.0
isort==5.13.2
mypy==1.8.0
```

### pyproject.toml

```toml
[tool.poetry]
name = "pp-gap-analysis-api"
version = "1.0.0"
description = "Past Performance Gap Analysis API"
authors = ["Your Name <you@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
# ... dependencies from requirements.txt

[tool.black]
line-length = 88
target-version = ['py311']
include = '\.pyi?$'

[tool.isort]
profile = "black"
line_length = 88

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

## 4. Database Setup

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: pp-analysis-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: pp_analysis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pp-analysis-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    container_name: pp-analysis-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Database Initialization

```sql
-- init-db.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create application user
CREATE USER app_user WITH PASSWORD 'app_password';
GRANT ALL PRIVILEGES ON DATABASE pp_analysis TO app_user;
```

---

## 5. Environment Configuration

### Backend (.env)

```env
# Application
APP_NAME=PP Gap Analysis
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pp_analysis
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10

# Authentication
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Claude API
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=8000

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small

# Storage (MinIO for local, R2 for production)
S3_BUCKET_NAME=pp-analysis-documents
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT_URL=http://localhost:9000
S3_REGION=us-east-1

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env.local)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

---

## 6. Production Infrastructure

### Vercel (Frontend)

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "@clerk_publishable_key"
  }
}
```

### Railway (Backend)

```toml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
```

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 7. Cost Estimates

### Monthly Operating Costs (Estimated)

| Service | Tier | Est. Cost | Notes |
|---------|------|-----------|-------|
| Vercel | Pro | $20/mo | Frontend hosting |
| Railway | Starter | $5-25/mo | Backend hosting |
| Supabase/Neon | Free/Pro | $0-25/mo | PostgreSQL + pgvector |
| Cloudflare R2 | Pay-as-you-go | $5-15/mo | Document storage |
| Claude API | Pay-as-you-go | $50-200/mo | Analysis (varies by usage) |
| OpenAI API | Pay-as-you-go | $5-20/mo | Embeddings |
| Clerk | Free/Pro | $0-25/mo | Authentication |
| **Total** | | **$85-330/mo** | |

### Usage-Based Estimates

| Action | API Cost | Notes |
|--------|----------|-------|
| Document metadata extraction | ~$0.05 | ~2K tokens |
| Full gap analysis | ~$0.50-1.00 | ~15K tokens |
| Embedding generation | ~$0.0001 | Per document |

---

## 8. Security Considerations

### Authentication
- Use Clerk for managed auth (OAuth, MFA, session management)
- JWT tokens with short expiration (24 hours)
- Refresh token rotation

### Data Protection
- All data encrypted at rest (managed services handle this)
- TLS 1.3 for all connections
- API keys stored in environment variables, never in code
- No PII in logs

### API Security
- Rate limiting (100 requests/minute per user)
- Input validation with Pydantic
- CORS restricted to known origins
- SQL injection prevention via ORM

### Infrastructure
- Private networking between services
- Regular dependency updates
- Security headers (CSP, HSTS)

---

## 9. Monitoring & Observability

### Recommended Tools

| Category | Tool | Purpose |
|----------|------|---------|
| Error Tracking | Sentry | Exception monitoring |
| Analytics | PostHog | User analytics |
| Logging | Axiom/Papertrail | Centralized logs |
| Uptime | Better Uptime | Availability monitoring |
| APM | Vercel Analytics | Performance monitoring |

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API latency (p95) | < 500ms | > 2s |
| Analysis latency | < 60s | > 120s |
| Error rate | < 0.1% | > 1% |
| Uptime | 99.9% | < 99% |
| Document processing time | < 30s | > 60s |

---

## 10. Development Tools

### Recommended VSCode Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.black-formatter",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "prisma.prisma",
    "github.copilot"
  ]
}
```

### VSCode Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "python.analysis.typeCheckingMode": "basic",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```
