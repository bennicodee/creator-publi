#!/usr/bin/env bash
# Resumo de uso da produção: contas, uso, assinaturas e acessos do dia. Só lê, não altera nada.
# Do seu computador, rode api/deploy/resumo.ps1 (manda este script pelo SSH; nada é instalado no servidor).
set -euo pipefail

COMPOSE="docker compose -f /opt/creatorpubli/api/docker-compose.prod.yml --env-file /opt/creatorpubli/api/.env.production"
LOG=/home/creatorpubliapi/logs/nginx/access.log
# </dev/null: o script chega pela entrada padrão (bash -s) e o docker exec a consumiria.
sql() { $COMPOSE exec -T db psql -U creatorpubli -d creatorpubli -P footer=off "$@" </dev/null; }

echo "===== CreatorPubli — $(TZ=America/Sao_Paulo date '+%d/%m/%Y %H:%M') ====="
echo
echo "API: $(curl -s --max-time 10 https://api.creatorpubli.com/health || echo 'SEM RESPOSTA')"
echo

echo "--- Contas ---"
sql -c "
select count(*) as total,
       count(*) filter (where created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as hoje,
       count(*) filter (where created_at >= now() - interval '7 days') as ultimos_7_dias,
       count(*) filter (where email_verified_at is not null) as email_confirmado,
       count(*) filter (where google_subject is not null) as com_google
from users;"

echo "--- Últimos cadastros ---"
sql -c "
select to_char(created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as quando,
       coalesce(nullif(nickname, ''), name) as nome, email,
       case when password_hash is null then 'Google' else 'e-mail' end as login,
       case when email_verified_at is null then 'não' else 'sim' end as confirmado
from users order by created_at desc limit 10;"

echo "--- Uso ---"
sql -c "
select (select count(*) from campaigns) as campanhas,
       (select count(distinct user_id) from campaigns) as contas_com_campanha,
       (select count(*) from profiles where public_slug is not null) as midia_kits_publicados,
       (select count(*) from reminder_settings where last_digest_on = (now() at time zone 'America/Sao_Paulo')::date) as resumos_processados_hoje;"

echo "--- Plano Creator ---"
sql -c "
select count(*) filter (where canceled_at is null and status = 'authorized') as assinantes_ativos,
       count(*) filter (where canceled_at is null and status = 'pending') as pagamento_pendente,
       count(*) filter (where canceled_at is null and status = 'paused') as pausadas,
       count(*) filter (where canceled_at is not null) as canceladas
from subscriptions;"

echo "--- Acessos à API hoje (sem o monitor) ---"
if [ -f "$LOG" ]; then
    today=$(date +%d/%b/%Y)
    lines=$(grep "$today" "$LOG" | grep -v UptimeRobot || true)
    if [ -z "$lines" ]; then
        echo "nenhum acesso ainda hoje"
    else
        echo "requisições:        $(echo "$lines" | wc -l)"
        echo "IPs diferentes:     $(echo "$lines" | awk '{print $1}' | sort -u | wc -l)"
        echo "celular:            $(echo "$lines" | grep -Eic 'iphone|android' || true) requisições"
        echo "erros do servidor:  $(echo "$lines" | awk '$9 ~ /^5/' | wc -l) (5xx)"
        echo "logins e cadastros:"
        # || true: dia sem nenhum login não é erro (grep sem resultado sai com 1).
        { echo "$lines" | grep -o 'POST /api/auth/[a-z-]*' || true; } | sed 's|POST /api/auth/||' | sort | uniq -c \
            | sed -e 's/register$/cadastro com e-mail/' -e 's/login$/login com e-mail/' -e 's/google$/login\/cadastro com Google/' \
                  -e 's/forgot-password$/esqueci minha senha/' -e 's/reset-password$/senha redefinida/' -e 's/verify-email$/e-mail confirmado/' \
            | sed 's/^/  /'
    fi
else
    echo "log não encontrado ($LOG)"
fi
