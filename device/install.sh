#!/bin/bash
#
# ZAccess Device — Instalação no Raspberry Pi 4 + Raspberry OS (Bookworm/Lite)
# Instala Node.js, compila pigpio a partir da pasta device (vendor/pigpio) e configura o serviço systemd.
# GPIO: 4 relés via pigpio. A biblioteca fica em vendor/pigpio-install dentro do device.
# Uso: sudo ./install.sh
#

set -e

INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"
NODE_VERSION_REQUIRED="18"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIGPIO_REPO="https://github.com/joan2937/pigpio.git"

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
echo "  (Raspberry Pi 4 + Raspberry OS)"
echo "=============================================="

# --- Dependências do sistema ---
echo "[*] Atualizando pacotes e instalando rsync + build-essential + git..."
apt-get update -qq
apt-get install -y -qq rsync build-essential git

# --- Parar pigpiod se existir (o dispositivo usa a biblioteca diretamente) ---
if systemctl is-active --quiet pigpiod 2>/dev/null; then
  echo "[*] Parando e desativando pigpiod..."
  systemctl stop pigpiod
  systemctl disable pigpiod
fi
killall pigpiod 2>/dev/null || true

# --- Node.js ---
install_node() {
  if command -v node &>/dev/null; then
    VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$VER" -ge "$NODE_VERSION_REQUIRED" ] 2>/dev/null; then
      echo "[OK] Node.js já instalado: $(node -v)"
      return
    fi
  fi

  echo "[*] Instalando Node.js 20 LTS (NodeSource)..."
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
  --exclude='vendor/pigpio-install' \
  "$SCRIPT_DIR/" "$INSTALL_DIR/"
chown -R root:root "$INSTALL_DIR"
if getent group gpio &>/dev/null; then
  chgrp -R gpio "$INSTALL_DIR" 2>/dev/null || true
  chmod -R g+rX "$INSTALL_DIR"
fi

# --- pigpio: usar fonte em vendor/pigpio (na pasta device) ---
PIGPIO_SRC="$INSTALL_DIR/vendor/pigpio"
PIGPIO_INSTALL="$INSTALL_DIR/vendor/pigpio-install"

if [ ! -f "$PIGPIO_SRC/Makefile" ]; then
  echo "[*] A clonar pigpio para $PIGPIO_SRC..."
  mkdir -p "$(dirname "$PIGPIO_SRC")"
  rm -rf "$PIGPIO_SRC"
  git clone --depth 1 "$PIGPIO_REPO" "$PIGPIO_SRC"
fi

echo "[*] A compilar e instalar pigpio em $PIGPIO_INSTALL..."
mkdir -p "$PIGPIO_INSTALL"
(cd "$PIGPIO_SRC" && make)
# make install com prefix local; o passo Python pode falhar (distutils) — ignoramos
(cd "$PIGPIO_SRC" && make install prefix="$PIGPIO_INSTALL" DESTDIR=) 2>/dev/null || true
# Se o install falhou no Python, instalar só as libs manualmente
if [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so" ] && [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so.1" ]; then
  mkdir -p "$PIGPIO_INSTALL/lib" "$PIGPIO_INSTALL/include"
  cp -a "$PIGPIO_SRC/libpigpio.so.1" "$PIGPIO_SRC/libpigpio.so" "$PIGPIO_INSTALL/lib/" 2>/dev/null || true
  cp -a "$PIGPIO_SRC/pigpio.h" "$PIGPIO_INSTALL/include/" 2>/dev/null || true
  (cd "$PIGPIO_INSTALL/lib" && ln -sf libpigpio.so.1 libpigpio.so 2>/dev/null)
fi

if [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so" ] && [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so.1" ]; then
  echo "[ERRO] Não foi possível instalar libpigpio em $PIGPIO_INSTALL/lib"
  exit 1
fi
echo "[OK] pigpio instalado em $PIGPIO_INSTALL"

# --- Dependências npm ---
echo "[*] Instalando dependências npm..."
cd "$INSTALL_DIR"
npm install --production --no-audit --no-fund
npm rebuild
cd "$SCRIPT_DIR"

# --- Configuração inicial ---
if [ ! -f "$INSTALL_DIR/config.json" ]; then
  cp "$INSTALL_DIR/config.default.json" "$INSTALL_DIR/config.json"
  echo "[*] config.json criado. Configure pela interface web (http://<IP>:3080)."
fi

# --- Serviço systemd (LD_LIBRARY_PATH aponta para a lib dentro do device) ---
echo "[*] Configurando serviço systemd..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=ZAccess Device - Agente Raspberry Pi (4 relés)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
Environment=LD_LIBRARY_PATH=$PIGPIO_INSTALL/lib
ExecStart=$(command -v node) $INSTALL_DIR/src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
SupplementaryGroups=gpio

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo ""
echo "=============================================="
echo "  Instalação concluída"
echo "=============================================="
echo ""
echo "  Serviço: $SERVICE_NAME"
echo "  Diretório: $INSTALL_DIR"
echo "  pigpio: $PIGPIO_INSTALL/lib"
echo "  Interface: http://<IP-deste-Raspberry>:3080"
echo ""
echo "  Comandos:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo systemctl restart $SERVICE_NAME"
echo "    sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "  Desinstalar: sudo $INSTALL_DIR/uninstall.sh"
echo ""
