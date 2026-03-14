#!/bin/bash
#
# ZAccess Device — Instalação completa no Raspberry Pi 4 + Raspberry OS (Bookworm/Lite)
#
# Faz tudo a partir de uma instalação limpa do SO:
#   - Dependências do sistema (rsync, build-essential, git)
#   - Para/desativa pigpiod (o dispositivo usa a lib pigpio diretamente)
#   - Node.js 20 LTS (NodeSource) se não existir
#   - Copia a aplicação para /opt/zaccess-device
#   - Clona e compila pigpio em vendor/pigpio → instala em vendor/pigpio-install
#   - npm install + npm rebuild (módulos nativos para esta máquina)
#   - Cria config.json a partir do default se não existir
#   - Serviço systemd com LD_LIBRARY_PATH para a lib do pigpio
#
# Uso: sudo ./install.sh
#      (executar a partir da pasta device do projeto)
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
  echo "ERRO: Execute este script a partir da pasta device (onde está package.json e src/)."
  exit 1
fi

echo ""
echo "=============================================="
echo "  ZAccess Device — Instalação"
echo "  Raspberry Pi 4 + Raspberry OS"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# 1. Dependências do sistema
# -----------------------------------------------------------------------------
echo "[1/7] Dependências do sistema..."
apt-get update -qq
apt-get install -y -qq rsync build-essential git
echo "      OK."
echo ""

# -----------------------------------------------------------------------------
# 2. Pigpiod não deve estar ativo (usamos a biblioteca diretamente)
# -----------------------------------------------------------------------------
echo "[2/7] Pigpiod (daemon)..."
if systemctl is-active --quiet pigpiod 2>/dev/null; then
  systemctl stop pigpiod
  systemctl disable pigpiod
  echo "      Parado e desativado."
else
  echo "      Não estava ativo."
fi
killall pigpiod 2>/dev/null || true
echo ""

# -----------------------------------------------------------------------------
# 3. Node.js 20 LTS
# -----------------------------------------------------------------------------
echo "[3/7] Node.js..."
if command -v node &>/dev/null; then
  VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "${VER:-0}" -ge "$NODE_VERSION_REQUIRED" ] 2>/dev/null; then
    echo "      Já instalado: $(node -v)"
  else
    NEED_NODE=1
  fi
else
  NEED_NODE=1
fi

if [ "${NEED_NODE:-0}" -eq 1 ]; then
  echo "      A instalar Node.js 20 LTS (NodeSource)..."
  apt-get install -y -qq ca-certificates curl gnupg
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
  echo "      Instalado: $(node -v)"
fi
echo ""

# -----------------------------------------------------------------------------
# 4. Copiar aplicação para /opt
# -----------------------------------------------------------------------------
echo "[4/7] A copiar aplicação para $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
rsync -a \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='config.json' \
  --exclude='*.log' \
  --exclude='vendor/pigpio-install' \
  "$SCRIPT_DIR/" "$INSTALL_DIR/"
chown -R root:root "$INSTALL_DIR"
if getent group gpio &>/dev/null; then
  chgrp -R gpio "$INSTALL_DIR" 2>/dev/null || true
  chmod -R g+rX "$INSTALL_DIR"
fi
chmod +x "$INSTALL_DIR/scripts/fix-service-env.sh" 2>/dev/null || true
echo "      OK."
echo ""

# -----------------------------------------------------------------------------
# 5. pigpio: clonar, compilar, instalar em vendor/pigpio-install
# -----------------------------------------------------------------------------
PIGPIO_SRC="$INSTALL_DIR/vendor/pigpio"
PIGPIO_INSTALL="$INSTALL_DIR/vendor/pigpio-install"

echo "[5/7] pigpio (biblioteca C para GPIO)..."
if [ ! -f "$PIGPIO_SRC/Makefile" ]; then
  echo "      A clonar repositório..."
  mkdir -p "$(dirname "$PIGPIO_SRC")"
  rm -rf "$PIGPIO_SRC"
  git clone --depth 1 "$PIGPIO_REPO" "$PIGPIO_SRC"
fi

echo "      A compilar..."
(cd "$PIGPIO_SRC" && make -s)

echo "      A instalar em $PIGPIO_INSTALL..."
mkdir -p "$PIGPIO_INSTALL"
(cd "$PIGPIO_SRC" && make install prefix="$PIGPIO_INSTALL" DESTDIR=) 2>/dev/null || true

# Se make install falhou no passo Python (distutils), instalar só as libs
if [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so" ] && [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so.1" ]; then
  mkdir -p "$PIGPIO_INSTALL/lib" "$PIGPIO_INSTALL/include"
  cp -a "$PIGPIO_SRC/libpigpio.so.1" "$PIGPIO_SRC/libpigpio.so" "$PIGPIO_INSTALL/lib/" 2>/dev/null || true
  [ -f "$PIGPIO_SRC/pigpio.h" ] && cp -a "$PIGPIO_SRC/pigpio.h" "$PIGPIO_INSTALL/include/"
  (cd "$PIGPIO_INSTALL/lib" && ln -sf libpigpio.so.1 libpigpio.so 2>/dev/null) || true
fi

if [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so" ] && [ ! -f "$PIGPIO_INSTALL/lib/libpigpio.so.1" ]; then
  echo "      ERRO: libpigpio não foi instalada em $PIGPIO_INSTALL/lib"
  exit 1
fi
echo "      OK (lib em $PIGPIO_INSTALL/lib)."
echo ""

# -----------------------------------------------------------------------------
# 6. npm install + rebuild (módulos nativos para esta máquina)
# -----------------------------------------------------------------------------
echo "[6/7] Dependências Node e rebuild..."
cd "$INSTALL_DIR"
npm install --production --no-audit --no-fund
npm rebuild
cd "$SCRIPT_DIR"
echo "      OK."
echo ""

# -----------------------------------------------------------------------------
# 7. Configuração e serviço systemd
# -----------------------------------------------------------------------------
echo "[7/7] Configuração e serviço systemd..."

if [ ! -f "$INSTALL_DIR/config.json" ]; then
  cp "$INSTALL_DIR/config.default.json" "$INSTALL_DIR/config.json"
  echo "      config.json criado a partir do default."
fi

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
echo "      Serviço ativado e iniciado."
echo ""

# -----------------------------------------------------------------------------
# Verificação rápida (módulo pigpio no diretório instalado)
# -----------------------------------------------------------------------------
echo "A verificar se o módulo pigpio carrega..."
if (cd "$INSTALL_DIR" && LD_LIBRARY_PATH="$PIGPIO_INSTALL/lib" node -e "require('pigpio'); process.exit(0)" 2>/dev/null); then
  echo "      OK (módulo nativo pigpio carregou)."
else
  echo "      AVISO: Não foi possível carregar o módulo pigpio. Verifique: journalctl -u $SERVICE_NAME -f"
fi
echo ""

# -----------------------------------------------------------------------------
# Resumo
# -----------------------------------------------------------------------------
echo "=============================================="
echo "  Instalação concluída"
echo "=============================================="
echo ""
echo "  Diretório:    $INSTALL_DIR"
echo "  Serviço:      $SERVICE_NAME"
echo "  pigpio lib:   $PIGPIO_INSTALL/lib"
echo "  Interface:    http://<IP-deste-Raspberry>:3080"
echo ""
echo "  Comandos:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo systemctl restart $SERVICE_NAME"
echo "    sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "  Se os relés não dispararem pelo frontend:"
echo "    sudo $INSTALL_DIR/scripts/fix-service-env.sh"
echo ""
echo "  Desinstalar:  sudo $INSTALL_DIR/uninstall.sh"
echo ""
