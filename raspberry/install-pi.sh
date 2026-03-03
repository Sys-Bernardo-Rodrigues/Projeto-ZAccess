#!/bin/bash
# =============================================================================
# Zaccess Raspberry Pi - Instalação e configuração como serviço
# Execute na pasta raspberry: bash install-pi.sh
# =============================================================================

set -e

# Diretório onde está o script (pasta do projeto)
# Se foi chamado com sudo e recebeu o path como $1, usa esse
if [[ -n "$1" && "$1" == /* ]]; then
    INSTALL_DIR="$1"
else
    INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
fi
SERVICE_NAME="zaccess"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

# -----------------------------------------------------------------------------
# 1. Verificar se está no Linux (Raspberry Pi OS)
# -----------------------------------------------------------------------------
if [[ "$(uname)" != "Linux" ]]; then
    warn "Este script é para Linux (Raspberry Pi OS). Ignorando checagem de SO."
fi

# -----------------------------------------------------------------------------
# 2. Verificar Node.js (instalar se não existir)
# -----------------------------------------------------------------------------
install_nodejs() {
    info "Instalando Node.js 20 (NodeSource)..."
    apt-get update -qq
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    if ! command -v node &>/dev/null; then
        error "Instalação do Node.js falhou. Instale manualmente e rode o script de novo."
    fi
    info "Node.js instalado: $(node -v)"
}

if ! command -v node &>/dev/null; then
    if [[ $EUID -eq 0 ]]; then
        install_nodejs
    else
        warn "Node.js não encontrado. O script precisa de sudo para instalá-lo."
        exec sudo bash "$0" "$INSTALL_DIR"
    fi
fi

NODE_VERSION=$(node -v)
info "Node.js: $NODE_VERSION"

# -----------------------------------------------------------------------------
# 3. Criar diretório de dados (SQLite)
# -----------------------------------------------------------------------------
mkdir -p "$INSTALL_DIR/data"
info "Diretório data/ criado (configuração em SQLite)."

# -----------------------------------------------------------------------------
# 4. Instalar dependências npm
# -----------------------------------------------------------------------------
info "Instalando dependências (npm install)..."
cd "$INSTALL_DIR"
npm install --production
info "Dependências instaladas."

# -----------------------------------------------------------------------------
# 5. Instalar serviço systemd (requer sudo)
# -----------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    info "Requer sudo para instalar o serviço. Executando com sudo..."
    exec sudo bash "$0" "$INSTALL_DIR"
fi

# Se foi chamado com sudo, o primeiro argumento pode ser o INSTALL_DIR passado
if [[ -n "$1" ]]; then
    INSTALL_DIR="$1"
fi

USER_RUN="${SUDO_USER:-$USER}"
NODE_PATH=$(which node)

info "Criando serviço systemd: $SERVICE_FILE"
info "  Diretório: $INSTALL_DIR"
info "  Usuário:   $USER_RUN"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Zaccess Raspberry Pi Client
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER_RUN
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_PATH $INSTALL_DIR/src/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=zaccess

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME.service"
systemctl start "$SERVICE_NAME.service"

info "Serviço instalado e iniciado."
echo ""
echo "Configure o dispositivo pelo painel web:"
echo "  http://IP_DO_RASPBERRY:5080"
echo "  (Configuração > URL do servidor, Serial, Token > Salvar > Reiniciar serviço)"
echo ""
echo "Comandos úteis:"
echo "  Status:    sudo systemctl status $SERVICE_NAME"
echo "  Logs:      sudo journalctl -u $SERVICE_NAME -f"
echo "  Parar:     sudo systemctl stop $SERVICE_NAME"
echo "  Reiniciar: sudo systemctl restart $SERVICE_NAME"
echo ""
systemctl status "$SERVICE_NAME" --no-pager || true
