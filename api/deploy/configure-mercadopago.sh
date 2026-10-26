#!/usr/bin/env bash
# Configura o pagamento do Plano Creator pelo Mercado Pago. Rode no terminal do servidor:
#   /opt/creatorpubli/api/deploy/configure-mercadopago.sh
# As chaves são digitadas aqui (não aparecem na tela nem no histórico) e vão só para o .env.production.
set -euo pipefail

API_DIR=/opt/creatorpubli/api
ENV_FILE=$API_DIR/.env.production

echo "Pagamento do Plano Creator (Mercado Pago)"
read -rsp "Access Token (TEST-... ou APP_USR-...; não aparece ao colar): " token
echo
read -rsp "Chave secreta dos webhooks (não aparece ao colar): " secret
echo
read -rp  "E-mail do comprador de teste (deixe vazio em produção): " test_payer

echo "Conferindo o Access Token no Mercado Pago..."
status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $token" https://api.mercadopago.com/users/me)
if [ "$status" != "200" ]; then
    echo "O Mercado Pago recusou o Access Token (HTTP $status). Confira se copiou o token inteiro." >&2
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
set_var MP_ACCESS_TOKEN "$token"
set_var MP_WEBHOOK_SECRET "$secret"
set_var MP_TEST_PAYER_EMAIL "$test_payer"
chmod 600 "$ENV_FILE"

echo "Reiniciando a API com a configuração nova..."
docker compose -f "$API_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE" up -d api >/dev/null 2>&1
echo "Tudo certo! O botão Assinar agora leva para a página de pagamento do Mercado Pago."
