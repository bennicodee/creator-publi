#!/usr/bin/env bash
# Configura o envio de e-mails da API pelo Resend (remetente nao-responda@creatorpubli.com).
# Rode no terminal do servidor:
#   /opt/creatorpubli/api/deploy/configure-smtp.sh
# A chave é digitada aqui (não aparece na tela nem no histórico) e vai só para o .env.production.
set -euo pipefail

API_DIR=/opt/creatorpubli/api
ENV_FILE=$API_DIR/.env.production
HOST=smtp.resend.com
PORT=587
SMTP_USER=resend
FROM=nao-responda@creatorpubli.com

echo "Envio de e-mails pelo Resend (remetente: $FROM)"
read -rsp "Chave de API do Resend (começa com re_; não aparece ao colar): " key
echo
read -rp  "Para qual e-mail mando o teste? " test_to

if [[ "$key" != re_* ]]; then
    echo "A chave do Resend começa com re_. Confira se copiou a chave inteira." >&2
    exit 1
fi

echo "Enviando um e-mail de teste para $test_to..."
msg=$(mktemp)
trap 'rm -f "$msg"' EXIT
printf 'From: CreatorPubli <%s>\r\nTo: %s\r\nSubject: Teste de envio do CreatorPubli\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nSe você recebeu este e-mail, o envio do CreatorPubli está funcionando.\r\n' "$FROM" "$test_to" > "$msg"
if ! curl -s --ssl-reqd --url "smtp://$HOST:$PORT" --user "$SMTP_USER:$key" \
        --mail-from "$FROM" --mail-rcpt "$test_to" --upload-file "$msg"; then
    echo "O Resend recusou o envio. Confira a chave e se o domínio creatorpubli.com já aparece como Verified no Resend." >&2
    exit 1
fi

set_var() {
    local name=$1 value=$2
    if grep -q "^$name=" "$ENV_FILE"; then
        sed -i "s|^$name=.*|$name=$value|" "$ENV_FILE"
    else
        echo "$name=$value" >> "$ENV_FILE"
    fi
}
set_var SMTP_HOST "$HOST"
set_var SMTP_PORT "$PORT"
set_var SMTP_USER "$SMTP_USER"
set_var SMTP_PASSWORD "$key"
set_var SMTP_FROM "$FROM"
chmod 600 "$ENV_FILE"

echo "Reiniciando a API com a configuração nova..."
docker compose -f "$API_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE" up -d api >/dev/null 2>&1
echo "Tudo certo! Confira a caixa de entrada (e o spam) de $test_to: deve ter chegado o e-mail de teste."
