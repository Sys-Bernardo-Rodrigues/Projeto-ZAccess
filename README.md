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

## Scripts úteis

| Onde | Comando | Descrição |
|------|---------|-----------|
| Raiz | `docker compose up -d` | Sobe MongoDB e Redis |
| server | `npm run dev` | API em modo desenvolvimento |
| server | `npm run seed` | Popula banco (admin) |
| client | `npm run dev` | Painel em desenvolvimento |

## Licença

Uso interno / conforme definido pelo projeto.
