# Zaccess – Controle de dispositivos IoT

Sistema para gerenciamento de dispositivos IoT: relés, sensores (inputs), locais, agendamentos, automações e convites de acesso. Inclui **API**, **painel web** e **app Flutter**.

## Visão geral da arquitetura

```
├── server/              # API Node.js (Express + MongoDB + Redis + Socket.IO)
├── client/              # Painel web React (Vite) – admin
├── app/                 # App Flutter – moradores e síndicos
├── docker-compose.yml   # MongoDB e Redis
└── .env                 # Variáveis de ambiente (copiar de .env.example)
```

**Fluxo principal**
- **Admin** usa o painel (`client`) para gerenciar locais, dispositivos, relés, sensores, agendamentos, automações e convites.
- **Dispositivos** conectam-se via WebSocket à API (`server`) para controle em tempo real.
- **Moradores/síndicos** usam o **app Flutter** para acionar relés, criar convites e visualizar logs do local.

## Pré-requisitos

- **Node.js** 18+
- **Docker** e **Docker Compose** (MongoDB e Redis)
- **Flutter SDK** (para o app em `app/`)

## Configuração (dev local)

1. **Copiar e ajustar `.env` na raiz**

   ```bash
   cp .env.example .env
   ```

   Ajuste pelo menos:
   - `MONGO_URI` (incluindo usuário/senha se usar auth no Mongo)
   - `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`
   - `REDIS_PASSWORD`
   - `JWT_SECRET`

2. **Subir MongoDB e Redis (Docker)**

   Na raiz do projeto:

   ```bash
   docker compose up -d
   ```

3. **Servidor (API)**

   ```bash
   cd server
   npm install
   npm run seed    # opcional: cria admin padrão
   npm run dev
   ```

   - API: **http://localhost:3000**
   - Admin seed (padrão): **`admin@zaccess.com.br` / `admin123_password`**

4. **Painel web (admin)**

   ```bash
   cd client
   npm install
   npm run dev
   ```

   - Painel: **http://localhost:5173**
   - Proxy `/api` e `/socket.io` → **http://localhost:3000**

5. **App Flutter (moradores/síndicos)**

   Veja `app/README.md` para detalhes. Exemplo (web):

   ```bash
   cd app
   flutter pub get
   flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
   ```

## Variáveis de ambiente (raiz)

| Variável | Descrição |
|----------|-----------|
| `NODE_ENV` | `development` ou `production` |
| `SERVER_PORT` | Porta da API (padrão: 3000) |
| `SERVER_HOST` | Host (padrão: 0.0.0.0) |
| `MONGO_URI` | URI do MongoDB (ex: `mongodb://user:pass@localhost:27017/zaccess`) |
| `MONGO_INITDB_ROOT_USERNAME` | Usuário root MongoDB (Docker) |
| `MONGO_INITDB_ROOT_PASSWORD` | Senha root MongoDB (Docker) |
| `MONGO_INITDB_DATABASE` | Nome do banco (Docker) |
| `REDIS_HOST` | Host do Redis (padrão: localhost) |
| `REDIS_PORT` | Porta do Redis (padrão: 6379) |
| `REDIS_PASSWORD` | Senha do Redis |
| `JWT_SECRET` | Chave secreta do JWT |
| `JWT_EXPIRES_IN` | Expiração do token (ex: 7d) |
| `VITE_API_URL` | URL da API para o client (ex: `http://localhost:3000`) |
| `VITE_WS_URL` | URL do WebSocket para o client (ex: `http://localhost:3000`) |
| `DOCS_USERNAME` | Usuário para acessar `/docs` (Swagger) |
| `DOCS_PASSWORD` | Senha para acessar `/docs` |
| `CORS_ALLOWED_ORIGINS` | Lista de origens permitidas (CSV) |
| `TRUST_PROXY` | Config de proxy Express (ex: `loopback`, `1`, `true`) |
| `FORCE_HTTPS` | Força redirecionamento para HTTPS quando `true` |

O servidor lê o `.env` da **raiz do repositório**.

## Documentação da API (OpenAPI / Swagger)

- Swagger UI protegido em: **http://localhost:3000/docs**
- Login:
  - Usuário: valor de `DOCS_USERNAME`
  - Senha: valor de `DOCS_PASSWORD`
- Cobertura:
  - Auth (admin e app)
  - Locais, dispositivos, relés, inputs
  - Agendamentos, automações, convites
  - Logs, relatórios e endpoints do app (`/api/app/*`)

## Deploy produção (VPS + Cloudflare)

### Cenário alvo
- Domínio público (API + painel): `https://api.zroot.online`
- HTTPS/porta 443: terminados no Cloudflare
- API de origem na VPS: `http://127.0.0.1:3000` (ou `http://SEU_HOST:3000`)

### 1) Configurar `.env` de produção

Use estes valores na VPS:

```bash
NODE_ENV=production
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

TRUST_PROXY=1
FORCE_HTTPS=true
CORS_ALLOWED_ORIGINS=https://api.zroot.online

PUBLIC_BASE_URL=https://api.zroot.online
VITE_API_URL=https://api.zroot.online
VITE_WS_URL=https://api.zroot.online
EXPO_PUBLIC_API_URL=https://api.zroot.online

CLOUDFLARE_TUNNEL_TOKEN=seu_token_do_tunnel
```

### 2) Configurar Cloudflare

- SSL/TLS em `Full` (ou `Full (strict)` se tiver certificado de origem).
- Tunnel com hostname `api.zroot.online` (e rotas para a origem abaixo).
- Origem do tunnel apontando para `http://SEU_HOST:3000`.
- Rotas usadas pela aplicação:
  - `/api/*`
  - `/socket.io/*`
  - `/docs` (opcional)

### 3) Subir na VPS

```bash
docker compose up -d
docker compose --profile cloudflare up -d cloudflared
```

### 4) Verificação pós-deploy

```bash
curl -I https://api.zroot.online/api/health
curl https://api.zroot.online/api/health
```

Resultado esperado:
- resposta `200` no `/api/health`
- redirecionamento HTTP -> HTTPS ativo (por `FORCE_HTTPS=true`)

## Scripts úteis

| Onde | Comando | Descrição |
|------|---------|-----------|
| Raiz | `docker compose up -d` | Sobe MongoDB e Redis |
| server | `npm run dev` | API em modo desenvolvimento |
| server | `npm run seed` | Popula banco (admin) |
| client | `npm run dev` | Painel em desenvolvimento |

## Observabilidade (Docker)

A stack de observabilidade foi adicionada no mesmo `docker-compose` com:
- **Prometheus** (coleta de métricas): `http://localhost:9090`
- **Alertmanager** (roteamento de alertas): `http://localhost:9093`
- **Grafana** (dashboards): `http://localhost:3001`
- **Elasticsearch** (logs/eventos): `http://localhost:9200`
- Exporters: node, cAdvisor, Redis e MongoDB
- **Filebeat** para ingestao de logs estruturados em `server/logs/server.log`

### Subir stack completa

```bash
docker compose up -d
```

### Instrumentacao da API

- Endpoint de metricas Prometheus: `GET /metrics`
- Endpoint de health: `GET /api/health`
- Metricas principais:
  - `http_requests_total`
  - `http_request_duration_seconds`
  - `zaccess_business_events_total`

### Alertas via webhook (.env)

Configure no `.env`:

```bash
ALERT_WEBHOOK_URL=http://seu-webhook/alerts
ALERT_WEBHOOK_TIMEOUT=5s
ALERT_WEBHOOK_SEND_RESOLVED=true
OBSERVABILITY_BIND_ADDR=127.0.0.1
ALERT_GROUP_WAIT=15s
ALERT_GROUP_INTERVAL=1m
ALERT_REPEAT_INTERVAL=2h
LOG_RETENTION_DAYS=15
SLO_AVAILABILITY_TARGET=99.9
SLO_ERROR_BUDGET=0.1
APDEX_TARGET=0.94
APDEX_TOLERATED=0.85
```

### Dashboards provisionados no Grafana

No folder `ZAccess`:
- `ZAccess - Infra e Containers`
- `ZAccess - API`
- `ZAccess - Eventos e Logs`
- `ZAccess - Overview Executivo`
- `ZAccess - NOC (SLA/SLO)`
- `ZAccess - Relatorio Mensal`

### Teste rapido da observabilidade

1. Suba o backend (`server`) e o compose.
2. Verifique o target `zaccess_server` em Prometheus (`/targets`).
3. Gere trafego na API e confira os paineis no Grafana.
4. Pare o backend por alguns minutos para validar alerta `ZaccessApiDown`.

## Licença

Uso interno / conforme definido pelo projeto.
