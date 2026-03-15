#!/bin/bash
# Recompila o módulo nativo pigpio com o Node atual (corrige "Module did not self-register").
# Pode ser executado na pasta device do projeto ou em /opt/zaccess-device.
# Uso: ./scripts/rebuild-pigpio.sh   ou   sudo /opt/zaccess-device/scripts/rebuild-pigpio.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVICE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"

# Trabalhar na pasta device do repo se existir package.json; senão usar /opt
if [ -f "$DEVICE_DIR/package.json" ]; then
  WORK_DIR="$DEVICE_DIR"
else
  WORK_DIR="$INSTALL_DIR"
fi

if [ ! -f "$WORK_DIR/package.json" ]; then
  echo "ERRO: package.json não encontrado em $WORK_DIR"
  exit 1
fi

echo "Node: $(command -v node) ($(node -v))"
echo "Pasta: $WORK_DIR"
echo ""

echo "[1/3] Remover e reinstalar pigpio (build from source)..."
cd "$WORK_DIR"
rm -rf node_modules/pigpio
npm install pigpio --build-from-source

echo "[2/3] Rebuild de módulos nativos..."
npm rebuild

# Se estiver em /opt e tiver serviço, parar/iniciar
if [ "$WORK_DIR" = "$INSTALL_DIR" ] && [ "$(id -u)" -eq 0 ] && systemctl is-enabled "$SERVICE_NAME" &>/dev/null; then
  echo "[3/3] Reiniciar serviço..."
  systemctl restart "$SERVICE_NAME"
  echo "Feito. Logs: sudo journalctl -u $SERVICE_NAME -f"
else
  echo "[3/3] Concluído. Reinicia a app (npm start) para usar o novo módulo."
fi
echo ""
