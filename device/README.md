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
- Raspberry Pi OS (ou compatível com GPIO)
- Módulo 4 relés com entradas ópticas (IN1–IN4, GND, VCC, JD-VCC)

## Instalação no Raspberry (recomendado)

Copie a pasta `device` para o Raspberry (por exemplo via SCP, USB ou clone do repositório). No Raspberry:

```bash
cd device
sudo ./install.sh
```

O script:
1. Instala **Node.js 20.x** (se não existir), via NodeSource.
2. Copia a aplicação para **/opt/zaccess-device**.
3. Instala dependências com `npm install --production`.
4. Cria e ativa o serviço systemd **zaccess-device** (inicia com o sistema).

Interface web: **http://\<IP-do-Raspberry\>:3080**

### Desinstalação

```bash
sudo ./uninstall.sh
```

- `sudo ./uninstall.sh --keep-files` — remove só o serviço; mantém os ficheiros em `/opt/zaccess-device`.
- `sudo ./uninstall.sh --remove-node` — remove também o Node.js (pode afetar outras aplicações).

### Comandos úteis

```bash
sudo systemctl status zaccess-device   # estado do serviço
sudo systemctl restart zaccess-device # reiniciar
sudo journalctl -u zaccess-device -f  # logs em tempo real
```

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
