# CreatorPubli

Painel para **creators de conteúdo** organizarem suas publis (campanhas pagas com marcas): status de cada
negociação, entregáveis e prazos, calendário, financeiro, lembretes, métricas dos posts, mídia kit público
e notas fiscais. Tem um plano gratuito e o **Plano Creator** (assinatura mensal de R$ 11,99).

No ar em **https://creatorpubli.com** (API em `https://api.creatorpubli.com`).

---

## Visão geral da arquitetura

```
                 ┌──────────────────────────────┐
  navegador ───► │ creatorpubli.com             │  React + TypeScript (Vite), site estático
                 │ Cloudflare Workers (assets)  │  publicado a cada push na main
                 └──────────────┬───────────────┘
                                │ HTTPS + JWT
                 ┌──────────────▼───────────────┐
                 │ api.creatorpubli.com          │  VPS Ubuntu (HostGator, São Paulo)
                 │ nginx (CloudPanel) + HTTPS    │  certificado Let's Encrypt
                 │        │ 127.0.0.1:5080       │
                 │ ┌──────▼───────┐ ┌──────────┐ │
                 │ │ API .NET 10  │─│PostgreSQL│ │  Docker Compose
                 │ └──────────────┘ └──────────┘ │
                 └───┬───────────┬───────────┬───┘
                     │           │           │
               Google Login   Resend      Mercado Pago      Cloudflare R2
               (OAuth)        (e-mail)    (assinaturas)     (backup externo)
```

| Camada | Onde roda | Domínio |
|---|---|---|
| Frontend | Cloudflare Workers (site estático) | `creatorpubli.com` |
| API + banco | VPS com Docker, atrás do nginx do CloudPanel | `api.creatorpubli.com` |
| DNS e certificados do site | Cloudflare | — |
| Backups do banco | VPS (14 dias) + Cloudflare R2 (30 dias) | — |

---

## Tecnologias

### Frontend
| Tecnologia | Para quê |
|---|---|
| **React 18** | Interface em componentes (páginas, cards, formulários, janelas de confirmação) |
| **TypeScript** | Tipagem de todo o app; os tipos do frontend (`src/types.ts`) são a base da modelagem do banco |
| **Vite** | Servidor de desenvolvimento e build de produção |
| **CSS puro com variáveis** | Tema escuro, layout responsivo (sidebar no desktop, barra inferior no celular) sem biblioteca de UI |
| **Roteamento por hash** (`#/campanhas`) | Roteador próprio, sem dependência; funciona em qualquer hospedagem estática |
| **Context API** (`AuthProvider`, `StoreProvider`) | Estado global de login e dos dados do app |
| **`fetch` + camada própria** (`src/lib/api.ts`) | Chamadas à API, token JWT, tratamento de erros e conversão de formatos (`""` ↔ `null`) |
| **Google Identity Services** | Botão "Continuar com Google" |
| **`<dialog>` nativo do HTML** | Janela de confirmação acessível (Esc fecha, foco preso na janela) |

Padrões usados no frontend:
- **Atualização otimista**: a tela muda na hora e a gravação na API acontece em seguida; se falhar, mostra aviso e recarrega do servidor.
- **Debounce** de 600 ms nos campos digitados (perfil, lembretes, nota fiscal), para não chamar a API a cada tecla.

### Backend (pasta `api/`)
| Tecnologia | Para quê |
|---|---|
| **.NET 10 / ASP.NET Core — Minimal APIs** | API REST em C# |
| **Entity Framework Core 10** + **Npgsql** | ORM e acesso ao PostgreSQL, com **migrations** versionando o esquema |
| **EFCore.NamingConventions** | Tabelas e colunas em `snake_case` no banco |
| **JWT Bearer** | Autenticação: a API devolve um token assinado (HMAC-SHA256) que o frontend envia em cada chamada |
| **ASP.NET Core Identity — `PasswordHasher`** | Hash de senha com PBKDF2 (a senha nunca é guardada) |
| **Google.Apis.Auth** | Valida no servidor o token do login com Google (assinatura, emissor, audiência) |
| **Data Annotations + validação nativa do .NET 10** | Validação das entradas com mensagens em português |
| **Rate Limiter do ASP.NET Core** | Limite de 10 tentativas/minuto por IP em login, cadastro, troca de senha etc. |
| **Forwarded Headers** | Enxergar o IP real do usuário atrás do nginx |
| **MailKit** | Envio de e-mails por SMTP, em segundo plano (`BackgroundService` + `Channel`) |
| **HttpClient tipado** | Integração com a API do Mercado Pago |
| **OpenAPI + Scalar** | Documentação interativa da API em desenvolvimento (`/scalar`) |
| **User Secrets** | Chaves de desenvolvimento fora do código e do Git |

### Banco de dados
| Tecnologia | Para quê |
|---|---|
| **PostgreSQL 17** | Banco relacional, em container Docker |
| **Modelagem relacional** | 11 tabelas: usuários, perfil, redes sociais, lembretes, assinaturas, campanhas, entregáveis, métricas, checklist, notas fiscais, links de redefinição de senha |
| **Restrições no banco** | `CHECK` nos campos de status/tipo, índices únicos (e-mail, slug do mídia kit), índice único parcial ("no máximo uma assinatura aberta por usuário") e exclusão em cascata |

### Integrações externas
| Serviço | Para quê |
|---|---|
| **Google OAuth (Google Cloud Console)** | Login com conta Google |
| **Resend (SMTP)** | E-mails transacionais ("esqueci minha senha") enviados de `nao-responda@creatorpubli.com`, com o domínio verificado por **SPF e DKIM** |
| **Mercado Pago — Assinaturas** | Cobrança recorrente do Plano Creator com checkout hospedado e **webhooks** validados por assinatura HMAC |
| **Mailpit** | Caixa de e-mail falsa para testar envios em desenvolvimento |

### Infraestrutura e DevOps
| Tecnologia | Para quê |
|---|---|
| **Git + GitHub** | Versionamento, branches por funcionalidade (`feat/...`) e merge na `main` |
| **Docker + Docker Compose** | API e banco em containers, iguais no desenvolvimento e na produção |
| **Dockerfile multi-stage** | Compila com o SDK e roda só com o runtime, com usuário sem privilégios |
| **VPS Linux (Ubuntu 22.04)** | Servidor de produção |
| **CloudPanel + nginx** | Proxy reverso para a API e certificado **Let's Encrypt** com renovação automática |
| **Cloudflare** | DNS do domínio, hospedagem do frontend (Workers) com deploy automático a cada push, armazenamento R2 |
| **Wrangler** (`wrangler.jsonc`) | Configuração de deploy do frontend no Cloudflare |
| **Cloudflare R2 + rclone** | Cópia dos backups do banco para fora do servidor |
| **cron + `pg_dump`** | Backup diário do banco às 3h30 |
| **Bash** | Scripts de deploy e configuração (`api/deploy/`) |

### Segurança aplicada
- SSH só com chave (login por senha desligado), em porta não padrão, com firewall (`ufw`) e fail2ban ativos.
- Banco sem nenhuma porta exposta; a API só escuta em `127.0.0.1` e é acessada pelo nginx.
- HTTPS em tudo (Cloudflare no site, Let's Encrypt na API).
- Senhas com hash PBKDF2; tokens de redefinição de senha guardados só como hash SHA-256, de uso único e com validade de 1 hora.
- "Esqueci minha senha" responde igual exista ou não a conta (não revela quais e-mails estão cadastrados).
- Rate limiting nas rotas de autenticação.
- CORS liberando só os domínios do app.
- Webhooks do Mercado Pago validados por HMAC antes de qualquer ação, e o estado é sempre reconsultado no Mercado Pago.
- Segredos (senhas, chaves de API) só em variáveis de ambiente no servidor ou em User Secrets, nunca no repositório.
- Dados de cartão nunca passam pelo app (checkout hospedado pelo Mercado Pago).

---

## Funcionalidades

- Cadastro e login com e-mail/senha ou Google; "esqueci minha senha" por e-mail; tela **Minha conta** (editar dados, trocar senha, excluir conta).
- Campanhas com kanban de status (proposta → negociando → fechada → produção → aprovação → postada → paga).
- Entregáveis (reels, stories, TikTok...) com prazos de roteiro, aprovação e postagem; calendário.
- Financeiro: valores fechados, recebidos e atrasados, com mensagem de cobrança pronta.
- Lembretes de prazos; métricas dos posts; assistente que monta checklist e roteiro a partir do briefing.
- Mídia kit com página pública (`creatorpubli.com/#/kit/seu-nome`) e notas fiscais pré-preenchidas (Plano Creator).
- Assinatura do Plano Creator pelo Mercado Pago.

---

## Decisões e problemas resolvidos (bom para contar em entrevista)

**Por que o frontend fora da VPS?** Site estático no Cloudflare é gratuito, rápido no Brasil inteiro e continua no ar mesmo se o servidor da API cair ou for trocado.

**Por que Docker na VPS?** A VPS era gratuita por um mês. Com tudo em containers, migrar para outro servidor é copiar os arquivos e subir o Compose, sem reinstalar nada.

**Modelagem a partir do frontend.** O app começou guardando tudo no navegador (localStorage). Na migração para banco + API, cada tipo do TypeScript virou uma tabela, e os valores fixos (status, tipo de entregável) foram gravados com os mesmos ids do frontend e protegidos por `CHECK` no banco.

**Rede corporativa bloqueando o desenvolvimento.** A rede do trabalho inspecionava o tráfego HTTPS com um certificado próprio: o `dotnet restore` dentro do Docker falhava ("UntrustedRoot"), o domínio novo era bloqueado e o envio de e-mail (SMTP com TLS) era cortado. Diagnóstico feito testando cada camada (do servidor, do PC, por porta); solução: compilar fora do container para testar localmente e validar envio e domínio a partir da própria VPS.

**Bug sutil de valor padrão no EF Core.** Ao adicionar o status da assinatura, um valor padrão no banco faria o EF tratar "pendente" (o primeiro valor do enum) como "não informado" e gravar "ativa" no lugar. O padrão foi colocado só na migration, para as assinaturas antigas, e não no modelo.

**IP real atrás do proxy.** O limite de tentativas por IP só funciona se a API enxergar o IP do usuário, não o do nginx. Foi resolvido com Forwarded Headers, liberados com segurança porque a API só aceita conexões locais.

**Pagamento confiável.** O webhook pode atrasar ou falhar; por isso a API também consulta o Mercado Pago quando a pessoa volta do pagamento. E o cancelamento só é marcado no app se o Mercado Pago confirmar, para a cobrança não continuar escondida.

---

## Como rodar localmente

Pré-requisitos: Node.js, .NET SDK 10 e Docker.

```bash
# banco de dados e caixa de e-mail de teste (http://localhost:8025)
cd api && docker compose up -d

# API em http://localhost:5080 (aplica as migrations sozinha; docs em /scalar)
dotnet run --project CreatorPubli.Api

# frontend em http://localhost:5173 (em outro terminal, na raiz)
npm install
npm run dev
```

Variáveis do frontend ficam em `.env.local` (modelo em `.env.example`). Detalhes da API, endpoints,
modelagem e deploy de produção estão em [api/README.md](api/README.md).

## Estrutura

```
src/                 frontend (React + TypeScript)
  pages/             telas (Dashboard, Campanhas, Plano, Login, Minha conta...)
  components/        componentes reaproveitáveis
  lib/api.ts         comunicação com a API
api/                 backend
  CreatorPubli.Api/  API .NET (Domain, Data, Endpoints, Contracts, Email, Payments)
  deploy/            scripts de backup e de configuração do servidor
  docker-compose*.yml
wrangler.jsonc       deploy do frontend no Cloudflare
```
