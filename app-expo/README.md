# ZAccess App (Expo Go)

Versão Expo Go compatível com o sistema atual, mantendo o app Flutter intacto.

## Pré-requisitos

- Node.js 18+
- App **Expo Go** instalado no celular
- API do ZAccess rodando (ex.: `http://SEU_IP:3000`)

## Configuração

Crie um arquivo `.env` em `app-expo/`:

```bash
EXPO_PUBLIC_API_URL=http://SEU_IP:3000
```

Exemplo na mesma rede Wi-Fi:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
```

## Rodando

```bash
cd app-expo
npm install
npm start
```

Depois:

- escaneie o QR do terminal com o Expo Go
- faça login com usuário de local (`/api/auth/location-user/login`)
- teste as telas já portadas

## Funcionalidades portadas do Flutter

- Login com usuário de local
- Home com listagem de relés e acionamento (`/api/app/relays`, `/api/app/relays/:id/toggle`)
- Convites: listar, criar, remover e copiar link (`/api/app/invitations`)
- Automações (`/api/app/automations`)
- Verificações/Logs (`/api/app/logs`) para perfil síndico

## Observações de compatibilidade

- O Expo usa os mesmos endpoints do backend atual.
- O `EXPO_PUBLIC_API_URL` deve apontar para o servidor acessível pelo celular na rede local.
- Exemplo: `http://192.168.1.50:3000` (não use `localhost` no aparelho físico).
