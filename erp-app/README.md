# ERP Platform

A production-ready, full-stack ERP web application built with **FastAPI** (Python) + **React** (TypeScript) + **PostgreSQL** + **Redis**, fully containerised with Docker.

---

## ✨ Features

| Module | Capabilities |
|---|---|
| **Dashboard** | Live KPIs, revenue charts, recent orders, alerts |
| **Customers** | Full CRUD, GST/company info, credit limits |
| **Products** | Inventory, SKU management, low-stock alerts, GST rates |
| **Orders** | Order lifecycle (draft → delivered), line items, tax calc |
| **Invoices** | Invoice tracking, payment recording, overdue detection |
| **Employees** | HR records, departments, salary, employment types |
| **Ledger** | Double-entry ledger, credits/debits, running balance |
| **Users** | Role-based access control (Admin, Manager, Accountant, Sales, Viewer) |
| **Settings** | Profile view, password change |

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- Git

### Steps

```bash
# 1. Clone
git clone <your-repo-url> erp-app
cd erp-app

# 2. Configure environment
cp .env.example .env
# Edit .env — set passwords etc. (defaults work for local dev)

# 3. Start (first run builds images; takes ~3-5 min)
docker compose up --build

# 4. Open browser
#    Frontend → http://localhost:3000
#    API docs  → http://localhost:8000/api/v1/docs
```

### Create first admin user (local)

```bash
docker compose exec backend python -c "
import asyncio
from app.db.session import AsyncSessionLocal, create_tables
from app.models.user import User, UserRole
from app.core.security import hash_password

async def main():
    await create_tables()
    async with AsyncSessionLocal() as db:
        u = User(
            email='admin@example.com',
            full_name='Admin',
            hashed_password=hash_password('Admin@1234'),
            role=UserRole.admin,
            is_active=True,
            is_superuser=True,
        )
        db.add(u)
        await db.commit()
        print('Done')
asyncio.run(main())
"
```

---

## 🌐 Production Deployment

### Server Requirements
- Ubuntu 22.04+ (or any Linux with Docker)
- 2 GB RAM minimum (4 GB recommended)
- Docker Engine + Docker Compose v2
- A domain name pointed at your server's IP

### Step-by-Step

#### 1. Install Docker (if not already installed)
```bash
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
newgrp docker
```

#### 2. Clone and configure
```bash
git clone <your-repo-url> /opt/erp-app
cd /opt/erp-app
cp .env.example .env
nano .env   # Fill in ALL values
```

**Critical `.env` values to change:**
```env
POSTGRES_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
SECRET_KEY=<64-char-hex-from-python-secrets>
CORS_ORIGINS=https://yourdomain.com
VITE_API_URL=https://yourdomain.com
```

Generate a secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
```

#### 3. Set up SSL certificates

**Option A — Let's Encrypt (recommended):**
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   docker/ssl/
```

**Option B — Your own certificate:**
```bash
mkdir -p docker/ssl
cp /path/to/fullchain.pem docker/ssl/
cp /path/to/privkey.pem   docker/ssl/
```

#### 4. Deploy
```bash
chmod +x deploy.sh backup.sh
sudo bash deploy.sh
```

The script will:
- Build all Docker images
- Start all services (db, redis, backend, frontend, nginx)
- Create a default admin user if none exists
- Print the login credentials

#### 5. Auto-renew SSL (Let's Encrypt)
```bash
# Add to crontab
crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/erp-app/docker/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/erp-app/docker/ssl/ && docker compose -f /opt/erp-app/docker-compose.yml restart nginx
```

#### 6. Schedule database backups
```bash
crontab -e
# Daily backup at 2am:
0 2 * * * cd /opt/erp-app && bash backup.sh >> /var/log/erp-backup.log 2>&1
```

---

## 🏗 Architecture

```
Internet
   │
   ▼
[Nginx :80/:443]  ← SSL termination, rate limiting, gzip
   ├── /api/*   → [FastAPI Backend :8000]  ← async Python
   └── /*       → [React Frontend :3000]   ← Vite SPA
                         │
              ┌──────────┴──────────┐
         [PostgreSQL :5432]    [Redis :6379]
```

### Tech Stack
| Layer | Technology |
|---|---|
| Backend | FastAPI 0.111, Python 3.12, SQLAlchemy 2.0 async |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Query |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Proxy | Nginx 1.25 with SSL/TLS |
| Container | Docker + Docker Compose v2 |

---

## 🔐 Security Features

- JWT access + refresh tokens (8h / 30d)
- bcrypt password hashing
- Role-based access control (5 roles)
- CORS restricted to configured origins
- Nginx rate limiting (API: 30 req/s, Login: 5 req/min)
- Security headers (HSTS, X-Frame-Options, CSP, etc.)
- Database ports bound to localhost only
- Non-root container user in production
- Environment-based secret management

---

## 📁 Project Structure

```
erp-app/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Route handlers
│   │   ├── core/               # Config, security, logging
│   │   ├── db/                 # SQLAlchemy session
│   │   ├── models/             # ORM models
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI
│   │   ├── pages/              # Route pages
│   │   ├── store/              # Zustand auth store
│   │   ├── lib/                # API client, utils
│   │   └── types/              # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker/
│   ├── nginx.conf
│   ├── init.sql
│   └── ssl/                    # Your certificates go here
├── docker-compose.yml
├── .env.example
├── deploy.sh
└── backup.sh
```

---

## 🔧 Common Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a service
docker compose restart backend

# Shell into backend
docker compose exec backend bash

# Run DB migrations (after model changes)
docker compose exec backend alembic upgrade head

# Stop everything
docker compose down

# Stop and delete all data (⚠️ destructive)
docker compose down -v
```

---

## 🆘 Troubleshooting

| Issue | Fix |
|---|---|
| Port 80/443 already in use | `sudo systemctl stop apache2 nginx` |
| DB connection refused | Wait 15s for healthcheck, then `docker compose logs db` |
| 502 Bad Gateway | Backend not ready yet; check `docker compose logs backend` |
| CORS error in browser | Ensure `CORS_ORIGINS` in `.env` matches your exact domain |
| SSL cert not found | Place certs in `docker/ssl/` as `fullchain.pem` and `privkey.pem` |

---

## 📄 License

MIT — use freely for commercial and personal projects.
