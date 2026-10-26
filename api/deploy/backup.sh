#!/usr/bin/env bash
# Backup diário do banco de produção. Agende no servidor com:
#   crontab -e  →  30 3 * * * /opt/creatorpubli/api/deploy/backup.sh >> /var/log/creatorpubli-backup.log 2>&1
# Guarda 14 dias em /var/backups/creatorpubli. Copie essa pasta para fora do servidor de vez em quando.
set -euo pipefail

DIR=/var/backups/creatorpubli
KEEP_DAYS=14
COMPOSE="docker compose -f /opt/creatorpubli/api/docker-compose.prod.yml --env-file /opt/creatorpubli/api/.env.production"

mkdir -p "$DIR"
chmod 700 "$DIR"
file="$DIR/creatorpubli-$(date +%Y-%m-%d_%H%M).sql.gz"

$COMPOSE exec -T db pg_dump -U creatorpubli --clean --if-exists creatorpubli | gzip > "$file"
chmod 600 "$file"
find "$DIR" -name 'creatorpubli-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "$(date -Is) backup ok: $file ($(du -h "$file" | cut -f1))"
