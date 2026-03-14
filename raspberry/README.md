# 🍓 Zaccess - Raspberry Pi Client

Cliente que roda **apenas no Raspberry Pi**. O servidor fica **remoto** — não é necessário instalar servidor nem banco no Pi.

## O que mandar para o Raspberry

- **Só a pasta `raspberry`** (código fonte + `package.json` + `.env.example`).
- **Não envie a pasta `node_modules`** — ela deve ser criada **no próprio Pi** com `npm install`. O módulo `better-sqlite3` é nativo e precisa ser compilado na arquitetura do Raspberry (ARM). Se você copiar `node_modules` do Windows/PC, verá o erro: `better_sqlite3.node: invalid ELF header`.

## Pré-requisitos no Pi

- Raspberry Pi 4 (ou 3) com **Raspberry Pi OS**
- **Módulo de Relé de 4 Canais** (compatível com a configuração padrão)
- Internet (para conectar ao servidor remoto)
- *(Opcional)* Node.js 18+ já instalado; caso contrário, o script de instalação instala Node.js 20 automaticamente.

## Instalação rápida no Raspberry (recomendado: script + serviço)

1. **Copie apenas a pasta `raspberry`** para o Pi (ex.: `/home/pi/zaccess`). Não copie `node_modules`.

2. **Execute o script de instalação** (instala o necessário e configura o serviço):
   ```bash
   cd /home/pi/zaccess   # ou o caminho onde colocou a pasta
   chmod +x install-pi.sh
   ./install-pi.sh
   ```
   O script pede **sudo** e faz em sequência:
   - **Dependências do sistema:** `curl`, `build-essential`, `python3`, `git` (para compilar módulos nativos)
   - **Node.js 20** (NodeSource), se não estiver instalado ou se a versão for menor que 18
   - **Diretório `data/`** para SQLite
   - **`npm install --production`** (better-sqlite3, onoff, etc.)
   - **Serviço systemd** `zaccess` (inicia no boot e reinicia se cair)

3. **Configure pelo painel web** (recomendado):
   - Acesse **http://IP_DO_RASPBERRY:5080**
   - Aba **Configuração** → preencha URL do servidor, Serial e Token → **Salvar**
   - Reinicie o serviço: `sudo systemctl restart zaccess`

A configuração fica salva em **SQLite** (`data/zaccess.db`). O `.env` ainda é lido como fallback se existir.

## Configuração

Toda a configuração é feita pelo **painel web** (porta 5080), gravada em SQLite:

| Campo | Descrição |
|-------|-----------|
| URL do servidor | **No Pi use o IP do PC/servidor** (ex: `http://192.168.1.10:3000`). Não use `localhost` — no Raspberry, localhost é o próprio Pi. |
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

## Erro "invalid ELF header" (better_sqlite3.node)

Esse erro aparece quando a pasta `node_modules` foi copiada de outro computador (ex.: Windows) para o Pi. Módulos nativos como `better-sqlite3` não podem ser reaproveitados entre sistemas diferentes.

**Solução:** no Raspberry, apague `node_modules` e instale de novo:

```bash
cd /home/zroot/raspberry   # ou o caminho da sua pasta
rm -rf node_modules
npm install
```

Depois inicie de novo: `npm start` ou `sudo systemctl restart zaccess`.

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

**Alimentação do módulo** (conectar no hardware; não controlados por software):

| Sinal   | Observação        |
|---------|-------------------|
| VCC     | Alimentação do módulo |
| JD-VCC  | Jump para ativar relés |
| GND     | Terra              |

**Entradas de controle (IN1–IN4) – números BCM (Raspberry Pi 4):**

| Canal | Sinal | GPIO BCM | Pino físico (40-pin) |
|-------|-------|----------|----------------------|
| 1     | IN1   | 5        | 29                   |
| 2     | IN2   | 6        | 31                   |
| 3     | IN3   | 13       | 33                   |
| 4     | IN4   | 19       | 35                   |

- Use um **módulo de relé de 4 canais**. O mapeamento está em `src/config.js` (`channelToGpio`). No painel admin, cadastre os relés com **GPIO BCM** (5, 6, 13, 19).
- Relés em contato seco (NO/NC).
- Modo **pulse**: ativa por X ms e desliga.
- Modo **toggle**: muda estado e mantém.
