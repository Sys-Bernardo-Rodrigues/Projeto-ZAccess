#!/bin/bash
# Corrige o unit systemd do zaccess-device para usar LD_LIBRARY_PATH da pasta vendor.
# Executar: sudo ./scripts/fix-service-env.sh   (a partir da pasta device ou /opt/zaccess-device)

set -e

INSTALL_DIR="${INSTALL_DIR:-/opt/zaccess-device}"
SERVICE_NAME="zaccess-device"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Usar pasta onde está vendor/pigpio-install (no Pi é /opt/zaccess-device)
if [ -d "$SCRIPT_DIR/../vendor/pigpio-install/lib" ]; then
  PIGPIO_LIB="$(cd "$SCRIPT_DIR/../vendor/pigpio-install/lib" && pwd)"
else
  PIGPIO_LIB="$INSTALL_DIR/vendor/pigpio-install/lib"
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo $0"
  exit 1
fi

if [ ! -d "$PIGPIO_LIB" ] || [ ! -f "$PIGPIO_LIB/libpigpio.so" ] && [ ! -f "$PIGPIO_LIB/libpigpio.so.1" ]; then
  echo "Não encontrado: $PIGPIO_LIB (libpigpio). Execute o install.sh primeiro."
  exit 1
fi

echo "A definir LD_LIBRARY_PATH=$PIGPIO_LIB no serviço $SERVICE_NAME..."
# Cria o unit com a variável correta (mantém o resto igual)
sed -i "s|^Environment=LD_LIBRARY_PATH=.*|Environment=LD_LIBRARY_PATH=$PIGPIO_LIB|" "/etc/systemd/system/${SERVICE_NAME}.service" 2>/dev/null || true
# Se não existir a linha, insere após [Service]
if ! grep -q "LD_LIBRARY_PATH" "/etc/systemd/system/${SERVICE_NAME}.service"; then
  sed -i "/\[Service\]/a Environment=LD_LIBRARY_PATH=$PIGPIO_LIB" "/etc/systemd/system/${SERVICE_NAME}.service"
fi

systemctl daemon-reload
systemctl restart "$SERVICE_NAME"
echo "Serviço reiniciado. Teste o frontend em http://<IP-do-Raspberry>:3080"
echo "  Logs: sudo journalctl -u $SERVICE_NAME -f"
