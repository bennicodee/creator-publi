#!/usr/bin/env bash
# Cadastra no servidor as chaves do Cloudflare R2 usadas pelo backup.sh.
# Rode no terminal do servidor (as chaves são digitadas aqui, não aparecem na tela nem no histórico):
#   /opt/creatorpubli/api/deploy/configure-r2.sh
set -euo pipefail

echo "Configuração do backup externo (Cloudflare R2)"
read -rp  "Account ID do Cloudflare: " account_id
read -rp  "Access Key ID: " access_key
read -rsp "Secret Access Key (não aparece ao digitar): " secret_key
echo

mkdir -p /root/.config/rclone
umask 077
cat > /root/.config/rclone/rclone.conf <<EOF
[r2]
type = s3
provider = Other
access_key_id = $access_key
secret_access_key = $secret_key
endpoint = https://$account_id.r2.cloudflarestorage.com
region = auto
acl = private
no_check_bucket = true
EOF
chmod 600 /root/.config/rclone/rclone.conf

echo "Testando o acesso ao bucket creatorpubli-backups..."
if echo "teste $(date -Is)" | rclone rcat r2:creatorpubli-backups/.teste-conexao && rclone deletefile r2:creatorpubli-backups/.teste-conexao; then
    echo "Tudo certo! Os próximos backups também serão copiados para o R2."
else
    echo "Não consegui gravar no bucket. Confira o Account ID, as chaves e o nome do bucket (creatorpubli-backups)." >&2
    exit 1
fi
