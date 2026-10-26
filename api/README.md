# CreatorPubli API

API em ASP.NET Core 10 (Minimal APIs) + EF Core + PostgreSQL para o app CreatorPubli.

## Rodando localmente

Pré-requisitos: .NET SDK 10 e Docker.

```bash
cd api
docker compose up -d          # PostgreSQL em localhost:5432
dotnet tool restore           # instala o dotnet-ef deste repositório
dotnet run --project CreatorPubli.Api
```

Em desenvolvimento a API aplica as migrations sozinha ao subir e publica a documentação interativa em
`/scalar` (OpenAPI em `/openapi/v1.json`). Para testar rotas protegidas, faça `POST /api/auth/register`
ou `/api/auth/login`, copie o `token` e use como Bearer.

## Configuração

| Chave | Para quê | Em produção (variável de ambiente) |
|---|---|---|
| `ConnectionStrings:Default` | Conexão com o PostgreSQL | `ConnectionStrings__Default` |
| `Jwt:Key` | Assinatura dos tokens (mín. 32 caracteres) | `Jwt__Key` |
| `Google:ClientId` | Valida o login com Google; o mesmo `VITE_GOOGLE_CLIENT_ID` do frontend | `Google__ClientId` |
| `Cors:Origins` | Endereços do frontend autorizados | `Cors__Origins__0`, `Cors__Origins__1`… |

Os valores de `appsettings.Development.json` são só para desenvolvimento: nunca use essa chave JWT em produção.

## Modelagem

Cada tabela corresponde a um tipo de `src/types.ts`. Textos fixos (status, tipo de entregável, forma de
pagamento, rede social) são gravados com o mesmo id do frontend (`producao`, `reels`, `pix`…) e
protegidos por `CHECK` no banco.

```
users ──1:1── profiles ──1:N── social_accounts      (Profile.networks)
  │    └─1:1── reminder_settings                    (ReminderSettings)
  │    └─1:N── subscriptions                        (Plan; ativa = canceled_at nulo)
  └──1:N── campaigns ──1:N── deliverables ──1:1── post_metrics
               │       └─1:N── checklist_items
               └──1:1── invoices
```

- Datas sem hora (`paymentDueDate`, `postDate`…) são `date`; no JSON vão como `"YYYY-MM-DD"` ou `null`
  (o frontend usa `""` para "sem data").
- `closedAt` e `paidAt` seguem o status automaticamente, com a mesma regra do `normalize()` do frontend.
- Entregáveis e itens do checklist têm `position` para manter a ordem da tela.
- Apagar um usuário ou uma campanha apaga em cascata tudo o que pertence a ele.

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/auth/register` | Cria conta com nome, e-mail e senha |
| POST | `/api/auth/login` | Login com e-mail e senha |
| POST | `/api/auth/google` | Login com o `credential` do botão do Google (validado no servidor) |
| GET | `/api/auth/me` | Usuário do token |
| PUT | `/api/account` | Altera nome e e-mail |
| PUT | `/api/account/password` | Troca a senha (ou cria uma, em contas só com Google) |
| POST | `/api/account/delete` | Exclui a conta e todos os dados (confirma com senha, ou e-mail em contas Google) |
| GET / POST | `/api/campaigns` | Lista / cria campanhas (com entregáveis, checklist e nota) |
| GET / PUT / DELETE | `/api/campaigns/{id}` | Busca / salva inteira / remove |
| PATCH | `/api/campaigns/{id}/status` | Move no kanban |
| PATCH | `/api/campaigns/{id}/deliverables/{deliverableId}` | Marca etapa, link do post ou métricas |
| DELETE | `/api/campaigns` | "Começar do zero" |
| GET / PUT | `/api/profile` | Perfil do creator (mídia kit e NF) |
| GET / PUT | `/api/settings` | Preferências de lembrete |
| GET | `/api/plan` | Plano atual |
| POST | `/api/plan/subscribe`, `/api/plan/cancel` | Assina / cancela (simulado, sem cobrança) |
| GET | `/api/public/kit/{slug}` | Mídia kit público (sem login; só com Plano Creator ativo) |

## Produção (VPS com CloudPanel)

A API e o banco rodam no Docker; o nginx do CloudPanel recebe `https://api.creatorpubli.com` e repassa
para `127.0.0.1:5080`. O banco não abre porta nenhuma para fora.

```bash
# no servidor, em /opt/creatorpubli (cópia do repositório)
cd api
cp .env.production.example .env.production   # preencha: openssl rand -base64 48
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

- As migrations rodam ao subir (`Database__MigrateOnStartup=true`).
- Login, cadastro, Google, troca de senha e exclusão de conta aceitam 10 tentativas por minuto por IP
  (o IP real vem do `X-Forwarded-For` do nginx).
- A documentação `/scalar` só existe em desenvolvimento.
- Backup diário: [deploy/backup.sh](deploy/backup.sh) (instruções de agendamento no próprio arquivo).

## Migrations

```bash
cd api/CreatorPubli.Api
dotnet ef migrations add NomeDaMudanca -o Data/Migrations
dotnet ef migrations script --idempotent -o schema.sql   # SQL para aplicar em produção
```
