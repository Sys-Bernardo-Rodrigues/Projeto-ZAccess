#!/bin/bash
#
# ZAccess Device — Desinstalação no Raspberry Pi OS
# Para o serviço, remove o unit e o diretório de instalação.
# Uso: sudo ./uninstall.sh   ou   sudo /opt/zaccess-device/uninstall.sh
#

set -e

INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"

# --- Verificações iniciais ---
if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo ./uninstall.sh"
  exit 1
fi

echo "=============================================="
echo "  ZAccess Device — Desinstalação"
echo "=============================================="

# --- Parar e desativar serviço ---
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "[*] Parando o serviço $SERVICE_NAME..."
  systemctl stop "$SERVICE_NAME"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "[*] Desativando o serviço $SERVICE_NAME..."
  systemctl disable "$SERVICE_NAME"
fi

# --- Remover unit do systemd ---
if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
  echo "[*] Removendo unit systemd..."
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
fi

# --- Remover diretório de instalação ---
if [ -d "$INSTALL_DIR" ]; then
  echo "[*] Removendo $INSTALL_DIR..."
  rm -rf "$INSTALL_DIR"
fi

echo ""
echo "[OK] ZAccess Device desinstalado."
echo ""

# --- Opcional: remover Node.js ---
if command -v node &>/dev/null; then
  echo "Node.js continua instalado (pode ser usado por outras aplicações)."
  read -r -p "Remover Node.js e npm? [y/N] " resp
  case "$resp" in
    [yY][eE][sS]|[yY])
      echo "[*] Removendo Node.js..."
      apt-get remove -y nodejs
      apt-get remove -y npm 2>/dev/null || true
      apt-get autoremove -y
      echo "[OK] Node.js removido."
      ;;
    *)
      echo "Node.js mantido."
      ;;
  esac
fi

echo "Até à próxima."
