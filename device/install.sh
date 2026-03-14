#!/bin/bash
#
# ZAccess Device — Instalação no Raspberry Pi OS
# Instala Node.js (se necessário), copia a aplicação para /opt e configura o serviço systemd.
# Uso: sudo ./install.sh
#

set -e

INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"
NODE_VERSION_REQUIRED="18"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Verificações iniciais ---
if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo ./install.sh"
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/package.json" ] || [ ! -d "$SCRIPT_DIR/src" ]; then
  echo "Execute este script a partir da pasta device do projeto (onde está package.json e src/)."
  exit 1
fi

echo "=============================================="
echo "  ZAccess Device — Instalação"
echo "=============================================="

# --- Node.js ---
# rsync para copiar a aplicação (pode não existir no minimal)
if ! command -v rsync &>/dev/null; then
  echo "[*] Instalando rsync..."
  apt-get update -qq && apt-get install -y -qq rsync
fi

install_node() {
  if command -v node &>/dev/null; then
    VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$VER" -ge "$NODE_VERSION_REQUIRED" ] 2>/dev/null; then
      echo "[OK] Node.js já instalado: $(node -v)"
      return
    fi
  fi

  echo "[*] Instalando Node.js 20 LTS (NodeSource)..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
  echo "[OK] Node.js instalado: $(node -v)"
}

install_node

# --- Copiar aplicação para /opt ---
echo "[*] Instalando aplicação em $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
rsync -a --exclude='node_modules' --exclude='.git' --exclude='config.json' --exclude='*.log' \
  "$SCRIPT_DIR/" "$INSTALL_DIR/"
chown -R root:root "$INSTALL_DIR"
# Permitir que utilizador pi (ou outro) leia; GPIO pode precisar do grupo gpio
if getent group gpio &>/dev/null; then
  chgrp -R gpio "$INSTALL_DIR" 2>/dev/null || true
  chmod -R g+rX "$INSTALL_DIR"
fi

# --- Dependências ---
echo "[*] Instalando dependências npm..."
cd "$INSTALL_DIR"
npm install --production --no-audit --no-fund
cd - >/dev/null

# --- Configuração inicial ---
if [ ! -f "$INSTALL_DIR/config.json" ]; then
  cp "$INSTALL_DIR/config.default.json" "$INSTALL_DIR/config.json"
  echo "[*] config.json criado a partir de config.default.json. Configure pela interface web."
fi

# --- Serviço systemd ---
echo "[*] Configurando serviço systemd..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=ZAccess Device - Agente Raspberry Pi (4 relés)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$(command -v node) $INSTALL_DIR/src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Acesso à GPIO (Raspberry Pi)
SupplementaryGroups=gpio

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo ""
echo "=============================================="
echo "  Instalação concluída"
echo "=============================================="
echo ""
echo "  Serviço: $SERVICE_NAME"
echo "  Diretório: $INSTALL_DIR"
echo "  Interface web: http://<IP-deste-Raspberry>:3080"
echo ""
echo "  Comandos úteis:"
echo "    sudo systemctl status $SERVICE_NAME   # estado"
echo "    sudo systemctl restart $SERVICE_NAME  # reiniciar"
echo "    sudo journalctl -u $SERVICE_NAME -f   # logs"
echo ""
echo "  Para desinstalar: sudo $INSTALL_DIR/uninstall.sh"
echo ""
