# 🍓 Zaccess - Raspberry Pi Client

Cliente que roda **apenas no Raspberry Pi**. O servidor fica **remoto** — não é necessário instalar servidor nem banco no Pi.

## O que mandar para o Raspberry

- **Só a pasta `raspberry`** (código fonte + `package.json` + `.env.example`).
- Não precisa enviar `server`, `client`, dados do servidor nem `docker-compose` do projeto principal.

## Pré-requisitos no Pi

- Raspberry Pi 4 (ou 3)
- Node.js 18+
- Módulo de relés (opcional, conforme seu hardware)
- Internet (para conectar ao servidor remoto)

## Instalação rápida no Raspberry (recomendado: script + serviço)

1. **Copie apenas a pasta `raspberry`** para o Pi (ex.: `/home/pi/zaccess`).

2. **Execute o script de instalação** (configura .env, dependências e serviço automático):
   ```bash
   cd /home/pi/zaccess   # ou o caminho onde colocou a pasta
   chmod +x install-pi.sh
   ./install-pi.sh
   ```
   O script vai:
   - Criar `.env` a partir de `.env.example` se não existir (e pedir para você editar)
   - Rodar `npm install`
   - Instalar e ativar o serviço **zaccess** (inicia no boot e reinicia se cair)

3. **Preencha o `.env`** (se ainda não editou):
   - `ZACESS_SERVER_URL` — URL do servidor (ex: `https://seu-servidor.com` ou `http://IP:3001`)
   - `ZACESS_SERIAL` — serial do dispositivo (registrado no servidor)
   - `ZACESS_AUTH_TOKEN` — token do dispositivo (gerado no servidor)
   ```bash
   nano .env
   sudo systemctl restart zaccess
   ```

Pronto: o cliente sobe como serviço e conecta ao servidor remoto ao ligar o Pi.

## Configuração

Toda a configuração do cliente é feita pelo **`.env`** (não é necessário editar `src/config.js` em uso normal):

| Variável | Descrição |
|----------|-----------|
| `ZACESS_SERVER_URL` | URL do servidor Zaccess (com porta se necessário) |
| `ZACESS_SERIAL` | Serial do dispositivo (cadastrado no servidor) |
| `ZACESS_AUTH_TOKEN` | Token de autenticação do dispositivo |

Mapeamento de GPIO para relés está em `src/config.js` (campo `channelToGpio`) — altere só se sua fiação for diferente.

## Execução

```bash
npm start
```

## Serviço automático

O **install-pi.sh** já instala o serviço `zaccess`. Comandos úteis:

| Comando | Descrição |
|---------|-----------|
| `sudo systemctl status zaccess` | Ver status |
| `sudo journalctl -u zaccess -f` | Ver logs em tempo real |
| `sudo systemctl restart zaccess` | Reiniciar (após editar .env) |
| `sudo systemctl stop zaccess` | Parar |
| `sudo systemctl start zaccess` | Iniciar |

## Conexão de relés (GPIO)

| Canal | GPIO Pin |
|-------|----------|
| 1–8   | 17, 18, 27, 22, 23, 24, 25, 4 |

- Relés em contato seco (NO/NC).
- Modo **pulse**: ativa por X ms e desliga.
- Modo **toggle**: muda estado e mantém.
