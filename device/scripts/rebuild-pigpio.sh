#!/bin/bash
# Recompila o módulo nativo pigpio com o MESMO Node que o serviço usa (evita "Module did not self-register").
# Executar no Raspberry: sudo /opt/zaccess-device/scripts/rebuild-pigpio.sh

set -e

INSTALL_DIR="/opt/zaccess-device"
SERVICE_NAME="zaccess-device"

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo $0"
  exit 1
fi

if [ ! -d "$INSTALL_DIR" ] || [ ! -f "$INSTALL_DIR/package.json" ]; then
  echo "Diretório $INSTALL_DIR não encontrado. Execute o install.sh primeiro."
  exit 1
fi

# Obter o Node usado pelo serviço (primeiro argumento do ExecStart)
NODE_PATH=$(sed -n 's/^ExecStart=\([^ ]*\).*/\1/p' "/etc/systemd/system/${SERVICE_NAME}.service" 2>/dev/null | head -1)
if [ -z "$NODE_PATH" ] || [ ! -x "$NODE_PATH" ]; then
  NODE_PATH=$(command -v node)
fi
export PATH="$(dirname "$NODE_PATH"):$PATH"
echo "A usar Node: $NODE_PATH ($($NODE_PATH -v))"
echo ""

echo "[1/4] Parar o serviço..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

echo "[2/4] Remover pigpio e reinstalar (build from source)..."
cd "$INSTALL_DIR"
rm -rf node_modules/pigpio
npm install pigpio --build-from-source

echo "[3/4] Rebuild de todos os módulos nativos..."
npm rebuild

echo "[4/4] Iniciar o serviço..."
systemctl start "$SERVICE_NAME"

echo ""
echo "Feito. Verifique: sudo journalctl -u $SERVICE_NAME -f"
echo "Se ainda aparecer 'Module did not self-register', confirme que não há outro Node (nvm, etc.): which -a node"
echo ""
