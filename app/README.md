# Zaccess App – Moradores e Síndicos

App Flutter para **moradores** e **síndicos** dos locais cadastrados no Zaccess. Acesso apenas com login de usuários do local (não usa o painel admin).

## Funcionalidades

- **Login**: e-mail e senha dos usuários cadastrados no local (painel admin → Locais → Usuários do local).
- **Automações**: visualizar automações do seu local.
- **Convites**: criar e gerenciar convites de acesso (portas/relés do local).
- **Verificações de acesso** (apenas **síndico**): ver acessos e uso de automações do local.

## Pré-requisitos

- Flutter SDK (recomendado 3.5+)
- Backend Zaccess rodando (API na porta 3001)

## Configuração da URL da API

Por padrão o app usa `http://10.0.2.2:3001` (Android emulador = localhost da máquina).

- **Emulador Android**: `10.0.2.2` aponta para o localhost do PC.
- **Emulador iOS**: use `http://localhost:3001` (altere em `lib/config/api_config.dart`).
- **Dispositivo físico**: use o IP da sua máquina na rede (ex: `http://192.168.1.10:3001`).

Para definir em build:

```bash
flutter run --dart-define=API_BASE_URL=http://SEU_IP:3001
```

Ou edite `lib/config/api_config.dart` e altere `defaultValue`.

## Como rodar

```bash
cd app
flutter pub get
flutter run
```

## Estrutura

- `lib/config/api_config.dart` – URL base da API
- `lib/services/auth_service.dart` – login e armazenamento do token
- `lib/services/api_service.dart` – chamadas à API do app
- `lib/screens/login_screen.dart` – tela de login
- `lib/screens/home_screen.dart` – início (menu)
- `lib/screens/automations_screen.dart` – lista de automações
- `lib/screens/invites_screen.dart` – convites (listar, criar, remover)
- `lib/screens/logs_screen.dart` – verificações (síndico)

## API utilizada

- `POST /api/auth/location-user/login` – login
- `GET /api/app/me` – perfil
- `GET /api/app/automations` – automações do local
- `GET /api/app/relays` – relés do local
- `GET /api/app/invitations` – convites
- `POST /api/app/invitations` – criar convite
- `DELETE /api/app/invitations/:id` – remover convite
- `GET /api/app/logs` – logs (síndico)
