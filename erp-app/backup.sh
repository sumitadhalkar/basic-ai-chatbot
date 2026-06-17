#!/usr/bin/env bash
# backup.sh — Backup PostgreSQL database to ./backups/
set -euo pipefail

source .env

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
FILENAME="${BACKUP_DIR}/erp_$(date +%Y%m%d_%H%M%S).sql.gz"

echo "Creating backup → $FILENAME"
docker compose exec -T db pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  | gzip > "$FILENAME"

echo "✅  Backup saved: $FILENAME"

# Keep only last 30 backups
ls -1t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "   Old backups pruned (keeping last 30)"
