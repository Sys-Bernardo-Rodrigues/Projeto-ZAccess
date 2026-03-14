#!/bin/bash
# ZAccess Device — Instalação no Raspberry Pi OS
# Instala Node.js, copia a aplicação para /opt/zaccess-device e configura serviço systemd.
# Executar com sudo: sudo ./install.sh

set -e

INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"
NODE_VERSION="20"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo $0"
  exit 1
fi

echo "=============================================="
echo "  ZAccess Device — Instalação"
echo "=============================================="

# --- 1. Node.js ---
if ! command -v node &>/dev/null; then
  echo "[1/5] Instalando Node.js ${NODE_VERSION}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
else
  echo "[1/5] Node.js já instalado: $(node -v)"
fi

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node.js 18+ é necessário. Atual: $(node -v). Instale manualmente ou atualize."
  exit 1
fi

# --- 2. Diretório de instalação ---
echo "[2/5] Copiando aplicação para ${INSTALL_DIR}..."
mkdir -p "$INSTALL_DIR"
if command -v rsync &>/dev/null; then
  rsync -a --exclude='node_modules' --exclude='config.json' --exclude='.git' \
    "$SCRIPT_DIR/" "$INSTALL_DIR/"
else
  (cd "$SCRIPT_DIR" && tar --exclude=node_modules --exclude=config.json --exclude=.git -cf - .) | (cd "$INSTALL_DIR" && tar xf -)
fi
[ ! -f "$INSTALL_DIR/config.json" ] && cp "$INSTALL_DIR/config.default.json" "$INSTALL_DIR/config.json"
chown -R root:root "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR"

# --- 3. Dependências ---
echo "[3/5] Instalando dependências npm..."
(cd "$INSTALL_DIR" && npm install --production --omit=dev)

# --- 4. Serviço systemd ---
echo "[4/5] Configurando serviço systemd..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=ZAccess Device (Raspberry Pi - 4 relés)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
# GPIO e acesso a /opt (root)
User=root
# Porta da interface web (opcional)
Environment=DEVICE_UI_PORT=3080

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# --- 5. Ativar e iniciar ---
echo "[5/5] Ativando e iniciando serviço..."
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo ""
echo "=============================================="
echo "  Instalação concluída"
echo "=============================================="
echo "  Interface web: http://<IP-deste-Raspberry>:3080"
echo "  Comandos:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo systemctl restart $SERVICE_NAME"
echo "    sudo journalctl -u $SERVICE_NAME -f"
echo "=============================================="
