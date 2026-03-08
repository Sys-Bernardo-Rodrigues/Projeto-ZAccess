# 🍓 Zaccess - Raspberry Pi Client

Cliente que roda **apenas no Raspberry Pi**. O servidor fica **remoto** — não é necessário instalar servidor nem banco no Pi.

## O que mandar para o Raspberry

- **Só a pasta `raspberry`** (código fonte + `package.json` + `.env.example`).
- Não precisa enviar `server`, `client`, dados do servidor nem `docker-compose` do projeto principal.

## Pré-requisitos no Pi

- Raspberry Pi 4 (ou 3)
- Node.js 18+
- **Módulo de Relé de 4 Canais** (compatível com a configuração padrão)
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

3. **Configure pelo painel web** (recomendado):
   - Acesse **http://IP_DO_RASPBERRY:5080**
   - Aba **Configuração** → preencha URL do servidor, Serial e Token → **Salvar**
   - Reinicie o serviço: `sudo systemctl restart zaccess`

A configuração fica salva em **SQLite** (`data/zaccess.db`). O `.env` ainda é lido como fallback se existir.

## Configuração

Toda a configuração é feita pelo **painel web** (porta 5080), gravada em SQLite:

| Campo | Descrição |
|-------|-----------|
| URL do servidor | Ex: `http://IP:3001` ou `https://seu-servidor.com:3001` |
| Número serial | O mesmo cadastrado no painel do servidor |
| Token | Copie no painel do servidor (Dispositivos → Editar → Copiar token) |

Após salvar, reinicie: `sudo systemctl restart zaccess`. O mapeamento de GPIO para o **módulo de 4 canais** está em `src/config.js` (campo `channelToGpio`) — altere só se sua fiação for diferente.

## Execução

```bash
npm start
```

## Painel web local (porta 5080)

Com o cliente rodando, um **painel web** fica disponível na rede na porta **5080**:

- **URL:** `http://IP_DO_RASPBERRY:5080`
- **Configuração:** formulário para URL do servidor, serial e token (salvo em SQLite). Reinicie o serviço após salvar.
- **Logs:** visualização em tempo real, com filtro por categoria
- **Sistema:** status da conexão, uptime, temperatura da CPU, memória e estados dos relés

Acesso apenas pela rede local (`0.0.0.0:5080`).

## Serviço automático

O **install-pi.sh** já instala o serviço `zaccess`. Comandos úteis:

| Comando | Descrição |
|---------|-----------|
| `sudo systemctl status zaccess` | Ver status |
| `sudo journalctl -u zaccess -f` | Ver logs em tempo real |
| `sudo systemctl restart zaccess` | Reiniciar (após editar .env) |
| `sudo systemctl stop zaccess` | Parar |
| `sudo systemctl start zaccess` | Iniciar |

## Desinstalar o serviço

Para remover o serviço (parar, desativar e apagar o unit do systemd):

```bash
sudo bash uninstall-pi.sh
```

Para também remover a pasta `node_modules` e liberar espaço:

```bash
sudo bash uninstall-pi.sh --full
```

O código e o `.env` continuam na pasta; use `./install-pi.sh` para reinstalar.

## Conexão de relés (GPIO) – Módulo de 4 Canais

| Canal | GPIO Pin (BCM) |
|-------|----------------|
| 1     | 17             |
| 2     | 18             |
| 3     | 27             |
| 4     | 22             |

- Use um **módulo de relé de 4 canais**. O mapeamento está em `src/config.js` (`channelToGpio`); altere só se sua fiação for diferente.
- Relés em contato seco (NO/NC).
- Modo **pulse**: ativa por X ms e desliga.
- Modo **toggle**: muda estado e mantém.
