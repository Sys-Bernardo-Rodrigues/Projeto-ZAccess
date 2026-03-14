#!/bin/bash
# ZAccess Device — Desinstalação no Raspberry Pi OS
# Para o serviço, remove o unit systemd e opcionalmente o diretório e o Node.js.
# Executar com sudo: sudo ./uninstall.sh [--keep-files] [--remove-node]

set -e

INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"
KEEP_FILES=false
REMOVE_NODE=false

for arg in "$@"; do
  case "$arg" in
    --keep-files)  KEEP_FILES=true ;;
    --remove-node) REMOVE_NODE=true ;;
    -h|--help)
      echo "Uso: sudo $0 [--keep-files] [--remove-node]"
      echo "  --keep-files   Não remove $INSTALL_DIR (apenas para serviço e config)"
      echo "  --remove-node  Desinstala Node.js (cuidado: pode afetar outros programas)"
      exit 0
      ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo $0"
  exit 1
fi

echo "=============================================="
echo "  ZAccess Device — Desinstalação"
echo "=============================================="

# --- 1. Parar e desativar serviço ---
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "[1/3] Parando serviço $SERVICE_NAME..."
  systemctl stop "$SERVICE_NAME"
fi
if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "      Desativando serviço..."
  systemctl disable "$SERVICE_NAME"
fi

# --- 2. Remover unit systemd ---
if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
  echo "[2/3] Removendo unit systemd..."
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
else
  echo "[2/3] Unit systemd não encontrado."
fi

# --- 3. Remover diretório de instalação ---
if [ "$KEEP_FILES" = true ]; then
  echo "[3/3] Mantendo arquivos em $INSTALL_DIR (--keep-files)."
else
  if [ -d "$INSTALL_DIR" ]; then
    echo "[3/3] Removendo $INSTALL_DIR..."
    rm -rf "$INSTALL_DIR"
  else
    echo "[3/3] Diretório $INSTALL_DIR não encontrado."
  fi
fi

# --- Opcional: remover Node.js ---
if [ "$REMOVE_NODE" = true ]; then
  echo "[extra] Desinstalando Node.js..."
  apt-get remove -y nodejs 2>/dev/null || true
  apt-get remove -y nodejs-doc 2>/dev/null || true
  # Remover repo NodeSource se existir
  if [ -f /etc/apt/sources.list.d/nodesource.list ]; then
    rm -f /etc/apt/sources.list.d/nodesource.list
  fi
  apt-get autoremove -y 2>/dev/null || true
  echo "      Node.js removido."
fi

echo ""
echo "=============================================="
echo "  Desinstalação concluída"
echo "=============================================="
