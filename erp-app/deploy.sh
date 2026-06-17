#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — One-shot production deployment script
# Usage: sudo bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Check .env ─────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    warn ".env created from .env.example — EDIT IT NOW before running again!"
    warn "  vi .env"
    exit 1
  else
    error "No .env or .env.example found."
  fi
fi

# Quick sanity check for placeholder values
if grep -q "CHANGE_ME" .env; then
  error "Found CHANGE_ME placeholders in .env. Please fill in real values first."
fi

# ── 2. SSL Certificates ───────────────────────────────────────────────────────
mkdir -p docker/ssl

if [ ! -f "docker/ssl/fullchain.pem" ] || [ ! -f "docker/ssl/privkey.pem" ]; then
  warn "SSL certificates not found at docker/ssl/"
  warn "Options:"
  warn "  A) Copy your existing certs:   cp /etc/letsencrypt/live/yourdomain/fullchain.pem docker/ssl/"
  warn "                                 cp /etc/letsencrypt/live/yourdomain/privkey.pem   docker/ssl/"
  warn "  B) Generate with certbot:      certbot certonly --standalone -d yourdomain.com"
  warn ""
  warn "Generating self-signed cert for local testing only (NOT for production)…"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout docker/ssl/privkey.pem \
    -out    docker/ssl/fullchain.pem \
    -subj   "/C=IN/ST=Maharashtra/L=Mumbai/O=ERP/CN=localhost" 2>/dev/null
  warn "Self-signed cert generated. Replace with real certs before going live."
fi

# ── 3. Build & start ──────────────────────────────────────────────────────────
info "Pulling base images…"
docker compose pull db redis nginx 2>/dev/null || true

info "Building application images…"
docker compose build --no-cache

info "Starting services…"
docker compose up -d

info "Waiting for database to be ready…"
for i in $(seq 1 30); do
  if docker compose exec db pg_isready -U "$(grep POSTGRES_USER .env | cut -d= -f2)" -q 2>/dev/null; then
    break
  fi
  sleep 2
done

# ── 4. Create first superuser if no users exist ───────────────────────────────
info "Checking for admin user…"
sleep 3   # let backend start
USER_COUNT=$(docker compose exec -T db psql \
  -U "$(grep POSTGRES_USER .env | cut -d= -f2)" \
  -d "$(grep POSTGRES_DB .env | cut -d= -f2)" \
  -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

if [ "${USER_COUNT// /}" = "0" ]; then
  info "No users found. Creating default admin…"
  docker compose exec -T backend python -c "
import asyncio
from app.db.session import AsyncSessionLocal, create_tables
from app.models.user import User, UserRole
from app.core.security import hash_password

async def main():
    await create_tables()
    async with AsyncSessionLocal() as db:
        u = User(
            email='admin@example.com',
            full_name='System Administrator',
            hashed_password=hash_password('Admin@1234'),
            role=UserRole.admin,
            is_active=True,
            is_superuser=True,
        )
        db.add(u)
        await db.commit()
        print('Admin user created: admin@example.com / Admin@1234')

asyncio.run(main())
"
  warn "DEFAULT CREDENTIALS: admin@example.com / Admin@1234"
  warn "CHANGE THE PASSWORD IMMEDIATELY after first login!"
fi

info ""
info "✅  Deployment complete!"
info "    HTTP  → http://your-domain  (redirects to HTTPS)"
info "    HTTPS → https://your-domain"
info ""
info "Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
