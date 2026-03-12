# Zaccess – Controle de dispositivos IoT

Sistema para gerenciamento de dispositivos IoT: relés, sensores (inputs), locais, agendamentos, automações e convites de acesso. Inclui API, painel web e cliente para Raspberry Pi.

## Estrutura do projeto

```
├── server/          # API Node.js (Express + MongoDB + Redis + Socket.IO)
├── client/          # Painel web React (Vite) – admin
├── raspberry/       # Cliente para Raspberry Pi (GPIO, painel local)
├── app/             # App Flutter – moradores e síndicos (automações, convites, verificações)
├── docker-compose.yml   # MongoDB e Redis
└── .env             # Variáveis do servidor (copie de .env.example)
```

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose (para MongoDB e Redis)
- Para dispositivos: Raspberry Pi 4/3 com Node.js 18+

## Configuração

1. **Copie o arquivo de ambiente** (na raiz do projeto):
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` com as suas configurações (ver variáveis abaixo).

2. **Suba MongoDB e Redis**:
   ```bash
   docker compose up -d
   ```

3. **Servidor (API)**:
   ```bash
   cd server
   npm install
   npm run seed    # opcional: usuário admin@zaccess.com.br / admin123_password
   npm run dev
   ```
   API em **http://localhost:3000**.

4. **Painel web**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Painel em **http://localhost:5173** (proxy para API em 3000).

5. **Raspberry Pi**: veja [raspberry/README.md](raspberry/README.md) para instalação no dispositivo.

6. **App (moradores/síndicos)**: app Flutter com login de usuários do local. Veja [app/README.md](app/README.md). Requer Flutter SDK e API rodando.

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
| `VITE_API_URL` | URL da API para o client (ex: http://localhost:3000) |
| `VITE_WS_URL` | URL do WebSocket para o client (ex: http://localhost:3000) |

O servidor lê o `.env` da **raiz do repositório**.

## Scripts úteis

| Onde | Comando | Descrição |
|------|---------|-----------|
| Raiz | `docker compose up -d` | Sobe MongoDB e Redis |
| server | `npm run dev` | API em modo desenvolvimento |
| server | `npm run seed` | Popula banco (admin) |
| client | `npm run dev` | Painel em desenvolvimento |
| raspberry | `npm start` | Cliente no Pi; painel local :5080 |

## Licença

Uso interno / conforme definido pelo projeto.
