#!/usr/bin/env bash
# Backup diário do banco de produção. Agende no servidor com:
#   crontab -e  →  30 3 * * * /opt/creatorpubli/api/deploy/backup.sh >> /var/log/creatorpubli-backup.log 2>&1
# Guarda 14 dias em /var/backups/creatorpubli e, se o R2 estiver configurado
# (deploy/configure-r2.sh), envia uma cópia para fora do servidor e guarda 30 dias lá.
set -euo pipefail

DIR=/var/backups/creatorpubli
KEEP_DAYS=14
REMOTE=r2:creatorpubli-backups
REMOTE_KEEP_DAYS=30
COMPOSE="docker compose -f /opt/creatorpubli/api/docker-compose.prod.yml --env-file /opt/creatorpubli/api/.env.production"

mkdir -p "$DIR"
chmod 700 "$DIR"
file="$DIR/creatorpubli-$(date +%Y-%m-%d_%H%M).sql.gz"

$COMPOSE exec -T db pg_dump -U creatorpubli --clean --if-exists creatorpubli | gzip > "$file"
chmod 600 "$file"
find "$DIR" -name 'creatorpubli-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "$(date -Is) backup ok: $file ($(du -h "$file" | cut -f1))"

if rclone listremotes 2>/dev/null | grep -qx "r2:"; then
    rclone copy "$file" "$REMOTE/"
    rclone delete --min-age "${REMOTE_KEEP_DAYS}d" "$REMOTE/"
    echo "$(date -Is) cópia enviada para $REMOTE"
fi
