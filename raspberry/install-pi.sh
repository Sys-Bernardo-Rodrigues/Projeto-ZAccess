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
# 2. Verificar Node.js
# -----------------------------------------------------------------------------
if ! command -v node &>/dev/null; then
    error "Node.js não encontrado. Instale com: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
fi

NODE_VERSION=$(node -v)
info "Node.js encontrado: $NODE_VERSION"

# -----------------------------------------------------------------------------
# 3. Criar .env se não existir (só pergunta se não for execução com sudo)
# -----------------------------------------------------------------------------
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
    info "Criando .env a partir de .env.example..."
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    if [[ $EUID -ne 0 ]]; then
        warn "Edite o arquivo .env com a URL do servidor, serial e token:"
        echo "   nano $INSTALL_DIR/.env"
        echo ""
        read -p "Pressione Enter após editar o .env (ou Ctrl+C para sair e editar depois)."
    else
        warn "Edite o .env antes de iniciar o serviço: nano $INSTALL_DIR/.env"
    fi
else
    info "Arquivo .env já existe."
fi

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
EnvironmentFile=$INSTALL_DIR/.env
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
echo "Comandos úteis:"
echo "  Status:    sudo systemctl status $SERVICE_NAME"
echo "  Logs:      sudo journalctl -u $SERVICE_NAME -f"
echo "  Parar:     sudo systemctl stop $SERVICE_NAME"
echo "  Reiniciar: sudo systemctl restart $SERVICE_NAME"
echo ""
systemctl status "$SERVICE_NAME" --no-pager || true
