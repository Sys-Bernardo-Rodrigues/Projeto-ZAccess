#!/bin/bash
# =============================================================================
# Zaccess Raspberry Pi - Desinstalação do serviço (reverso do install-pi.sh)
# Execute na pasta raspberry: sudo bash uninstall-pi.sh
# Opção: sudo bash uninstall-pi.sh --full   (remove também node_modules)
# =============================================================================

set -e

SERVICE_NAME="zaccess"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Diretório onde está o script
if [[ -n "$1" && "$1" == /* ]]; then
    INSTALL_DIR="$1"
    shift
fi
if [[ -z "$INSTALL_DIR" ]]; then
    INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

REMOVE_DEPS=false
REMOVE_DATA=false
for arg in "$@"; do
    if [[ "$arg" == "--full" ]]; then
        REMOVE_DEPS=true
        REMOVE_DATA=true
    fi
done

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

# -----------------------------------------------------------------------------
# Requer sudo para remover serviço
# -----------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    warn "Requer sudo para remover o serviço."
    exec sudo bash "$0" "$INSTALL_DIR" "$@"
fi

# -----------------------------------------------------------------------------
# 1. Parar e desativar o serviço
# -----------------------------------------------------------------------------
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    info "Parando o serviço $SERVICE_NAME..."
    systemctl stop "$SERVICE_NAME"
else
    info "Serviço $SERVICE_NAME já está parado."
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    info "Desativando o serviço (não inicia mais no boot)..."
    systemctl disable "$SERVICE_NAME"
fi

# -----------------------------------------------------------------------------
# 2. Remover arquivo do serviço
# -----------------------------------------------------------------------------
if [[ -f "$SERVICE_FILE" ]]; then
    info "Removendo $SERVICE_FILE"
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    info "Serviço removido."
else
    warn "Arquivo do serviço não encontrado: $SERVICE_FILE"
fi

# -----------------------------------------------------------------------------
# 3. Opcional (--full): remover node_modules e data/ (SQLite)
# -----------------------------------------------------------------------------
if [[ "$REMOVE_DEPS" == true && -d "$INSTALL_DIR/node_modules" ]]; then
    info "Removendo node_modules (--full)..."
    rm -rf "$INSTALL_DIR/node_modules"
    info "node_modules removido."
elif [[ "$REMOVE_DEPS" == true ]]; then
    info "Pasta node_modules não encontrada."
fi

if [[ "$REMOVE_DATA" == true && -d "$INSTALL_DIR/data" ]]; then
    info "Removendo data/ (configuração SQLite)..."
    rm -rf "$INSTALL_DIR/data"
    info "data/ removido."
fi

echo ""
info "Desinstalação concluída."
echo ""
echo "O que permanece na pasta $INSTALL_DIR:"
echo "  - Código fonte (src/, package.json, etc.)"
[[ "$REMOVE_DATA" != true ]] && echo "  - data/ (configuração em SQLite)"
[[ "$REMOVE_DEPS" != true ]] && echo "  - node_modules (use uninstall-pi.sh --full para remover)"
echo ""
echo "Para reinstalar: ./install-pi.sh"
echo "Para apagar tudo: rm -rf $INSTALL_DIR"
