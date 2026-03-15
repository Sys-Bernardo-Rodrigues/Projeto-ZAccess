# ZAccess — Dispositivo Raspberry Pi (4 relés)

Sistema que roda no Raspberry Pi: conecta ao servidor ZAccess via Socket.IO e controla um módulo de **4 relés** através da interface web local.

## Ligação do módulo de 4 relés

| Sinal  | Pino físico Raspberry |
|--------|------------------------|
| IN1    | 29 (GPIO 5)            |
| IN2    | 31 (GPIO 6)            |
| IN3    | 33 (GPIO 13)           |
| IN4    | 35 (GPIO 19)           |
| GND    | 20                     |
| VCC    | 17 (3.3 V)             |
| JD-VCC | 2 (5 V)                |

## Requisitos

- Node.js 18+
- **Raspberry Pi 4 Model B** com **Raspberry OS** — o código usa **pigpio** (acesso via `/dev/gpiomem`).
- A biblioteca pigpio é compilada **dentro da pasta do device** (`vendor/pigpio` → `vendor/pigpio-install`); o `install.sh` clona o repositório [joan2937/pigpio](https://github.com/joan2937/pigpio) se não existir.
- O daemon `pigpiod` não deve estar ativo (o Node usa a biblioteca diretamente).
- Módulo 4 relés com entradas ópticas (IN1–IN4, GND, VCC, JD-VCC).

## Opcional: ter o pigpio já na pasta device

Para incluir o código fonte do pigpio no teu repositório (evita clonar durante o install):

```bash
cd device
mkdir -p vendor
git clone --depth 1 https://github.com/joan2937/pigpio.git vendor/pigpio
```

O `install.sh` usa `vendor/pigpio` se existir; caso contrário clona-o em `/opt/zaccess-device/vendor/pigpio`.

## Instalação no Raspberry (recomendado: script)

No Raspberry Pi, clone o repositório (ou copie a pasta `device`), entre na pasta e execute:

```bash
cd /caminho/para/Projeto-ZAccess/device
sudo ./install.sh
```

O script:
- Instala **Node.js 20 LTS** (NodeSource) e **build-essential** + **git** se necessário
- Copia a aplicação para **/opt/zaccess-device**
- Clona **pigpio** para `vendor/pigpio` (se ainda não existir), compila e instala em **vendor/pigpio-install** (lib dentro do device)
- Instala dependências npm e faz **npm rebuild**
- Cria o serviço systemd **zaccess-device** com `LD_LIBRARY_PATH` apontando para `vendor/pigpio-install/lib`
- Inicia o serviço

Interface web: `http://<IP-do-Raspberry>:3080`

### Relés não disparam / "Module did not self-register"

Se aparecer **"Module did not self-register"** ou **"pigpio não disponível"** nos logs, o módulo nativo foi compilado para outra versão do Node. Recompile no Raspberry com o mesmo Node que o serviço usa:

```bash
sudo /opt/zaccess-device/scripts/rebuild-pigpio.sh
```

Se os relés continuarem em "simulação" mas não houver esse erro, confira o `LD_LIBRARY_PATH`:

```bash
sudo /opt/zaccess-device/scripts/fix-service-env.sh
```

Depois teste em `http://<IP>:3080`.

### Desinstalação

```bash
sudo /opt/zaccess-device/uninstall.sh
```

Ou, a partir da pasta do repositório: `sudo ./uninstall.sh` (remove o que está em /opt e o serviço).

---

## Instalação manual (sem script)

```bash
cd device
npm install
```

## Uso

1. **Registrar o dispositivo no servidor**  
   No painel web do ZAccess (backend), em **Dispositivos → Adicionar**, crie um dispositivo. Anote o **número de série** e o **token de autenticação**.

2. **Iniciar o serviço local**  
   No Raspberry:
   ```bash
   npm start
   ```

3. **Abrir o frontend de configuração**  
   No navegador (no próprio Raspberry ou em outro PC na mesma rede):
   ```
   http://<IP-do-Raspberry>:3080
   ```

4. **Configurar e conectar**  
   - **URL do servidor**: ex. `https://seu-servidor.com` ou `http://192.168.1.10:5000`
   - **Número de série** e **Token**: os obtidos no passo 1  
   Clique em **Salvar configuração** e depois em **Conectar**.

5. **Opcional**: marque **Conectar automaticamente ao iniciar** e salve para o dispositivo conectar sozinho após reinício.

## Variáveis de ambiente

- `DEVICE_UI_PORT`: porta da interface web (padrão: **3080**).

## Estrutura

- `src/server.js` — Servidor Express (UI + API de configuração e controle do agente).
- `src/agent.js` — Cliente Socket.IO e lógica de relés (comandos `relay:toggle`, `relay:control`).
- `src/gpio.js` — Controle GPIO (BCM 5, 6, 13, 19).
- `src/configLoader.js` — Leitura/gravação de `config.json`.
- `public/index.html` — Frontend de configuração.

O ficheiro `config.json` é criado ao salvar pela primeira vez na UI (não versionado; use `config.default.json` como referência).
