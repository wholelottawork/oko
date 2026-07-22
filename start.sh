#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# OKO AI Trading System - Docker Quick Start Script
# Usage: ./start.sh [command]
# ═══════════════════════════════════════════════════════════════

set -e

# ------------------------------------------------------------------------
# Color Definitions
# ------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ------------------------------------------------------------------------
# Utility Functions: Colored Output
# ------------------------------------------------------------------------
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ------------------------------------------------------------------------
# Detection: Docker Compose Command (Backward Compatible)
# ------------------------------------------------------------------------
detect_compose_cmd() {
    if command -v docker compose &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose is not installed. Install Docker Compose first."
        exit 1
    fi
    print_info "Using Docker Compose command: $COMPOSE_CMD"
}

# ------------------------------------------------------------------------
# Validation: Docker Installation
# ------------------------------------------------------------------------
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi

    detect_compose_cmd
    print_success "Docker and Docker Compose are installed"
}

# ------------------------------------------------------------------------
# Validation: Environment File (.env)
# ------------------------------------------------------------------------
check_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env does not exist; copying it from the template..."
        cp .env.example .env
        print_info "Created .env file"
    fi
    print_success "Environment file exists"
}

# ------------------------------------------------------------------------
# Helper: Check if env var is set and not placeholder
# ------------------------------------------------------------------------
is_env_configured() {
    local var_name="$1"
    local value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d'=' -f2-)

    # Remove quotation marks
    value=$(echo "$value" | tr -d '"'"'")

    # Check whether the value is empty or a placeholder
    if [ -z "$value" ]; then
        return 1
    fi

    # Check whether the value is an example
    case "$value" in
        *your-*|*YOUR_*|*change-this*|*CHANGE_THIS*|*example*|*EXAMPLE*)
            return 1
            ;;
    esac

    return 0
}

# ------------------------------------------------------------------------
# Helper: Generate and set env var in .env file
# ------------------------------------------------------------------------
set_env_var() {
    local var_name="$1"
    local var_value="$2"

    # Replace the variable if it already exists, even if it is a placeholder
    if grep -q "^${var_name}=" .env 2>/dev/null; then
        # Use sed syntax compatible with macOS and Linux
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" .env
        else
            sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" .env
        fi
    else
        # Append the variable when it does not exist
        echo "${var_name}=${var_value}" >> .env
    fi
}

# ------------------------------------------------------------------------
# Validation: Encryption Keys in .env
# ------------------------------------------------------------------------
check_encryption() {
    print_info "Checking encryption key configuration..."

    local generated=false

    # Check and generate JWT_SECRET
    if ! is_env_configured "JWT_SECRET"; then
        print_warning "JWT_SECRET is not configured; generating it..."
        local jwt_secret=$(openssl rand -base64 32)
        set_env_var "JWT_SECRET" "$jwt_secret"
        print_success "JWT_SECRET generated"
        generated=true
    fi

    # Check and generate DATA_ENCRYPTION_KEY
    if ! is_env_configured "DATA_ENCRYPTION_KEY"; then
        print_warning "DATA_ENCRYPTION_KEY is not configured; generating it..."
        local data_key=$(openssl rand -base64 32)
        set_env_var "DATA_ENCRYPTION_KEY" "$data_key"
        print_success "DATA_ENCRYPTION_KEY generated"
        generated=true
    fi

    # Check and generate RSA_PRIVATE_KEY
    if ! is_env_configured "RSA_PRIVATE_KEY"; then
        print_warning "RSA_PRIVATE_KEY is not configured; generating it..."
        # Generate the RSA key and convert it to a single-line format (replace newlines with \n)
        local rsa_key=$(openssl genrsa 2048 2>/dev/null | awk '{printf "%s\\n", $0}')
        set_env_var "RSA_PRIVATE_KEY" "\"$rsa_key\""
        print_success "RSA_PRIVATE_KEY generated"
        generated=true
    fi

    if [ "$generated" = true ]; then
        echo ""
        print_success "All missing keys were generated and saved to .env"
        print_warning "Keep the .env file secure and do not commit it to version control"
        echo ""
    fi

    print_success "Encryption key check completed"
    print_info "  • JWT_SECRET: OK"
    print_info "  • DATA_ENCRYPTION_KEY: OK"
    print_info "  • RSA_PRIVATE_KEY: OK"

    # Restrict .env file permissions
    chmod 600 .env 2>/dev/null || true
}

# ------------------------------------------------------------------------
# Utility: Read Environment Variables
# ------------------------------------------------------------------------
read_env_vars() {
    if [ -f ".env" ]; then
        OKO_FRONTEND_PORT=$(grep "^OKO_FRONTEND_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "3000")
        OKO_BACKEND_PORT=$(grep "^OKO_BACKEND_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "8080")

        OKO_FRONTEND_PORT=$(echo "$OKO_FRONTEND_PORT" | tr -d '"'"'" | tr -d ' ')
        OKO_BACKEND_PORT=$(echo "$OKO_BACKEND_PORT" | tr -d '"'"'" | tr -d ' ')

        OKO_FRONTEND_PORT=${OKO_FRONTEND_PORT:-3000}
        OKO_BACKEND_PORT=${OKO_BACKEND_PORT:-8080}
    else
        OKO_FRONTEND_PORT=3000
        OKO_BACKEND_PORT=8080
    fi
}

# ------------------------------------------------------------------------
# Validation: Database Directory (data/)
# ------------------------------------------------------------------------
check_database() {
    # Ensure data directory exists
    if [ ! -d "data" ]; then
        print_warning "The data directory does not exist; creating data/..."
        install -m 700 -d data
        print_success "Created data/ directory"
    else
        print_success "Data directory exists"
    fi
}

# ------------------------------------------------------------------------
# Service Management: Start
# ------------------------------------------------------------------------
start() {
    print_info "Starting OKO AI Trading System..."

    read_env_vars

    if [ ! -d "data" ]; then
        print_info "Creating data directory..."
        install -m 700 -d data
    fi

    if [ "$1" == "--build" ]; then
        print_info "Rebuilding images..."
        $COMPOSE_CMD up -d --build
    else
        print_info "Starting containers..."
        $COMPOSE_CMD up -d
    fi

    print_success "Services started"
    print_info "Web interface: http://localhost:${OKO_FRONTEND_PORT}"
    print_info "API endpoint: http://localhost:${OKO_BACKEND_PORT}"
    print_info ""
    print_info "View logs: ./start.sh logs"
    print_info "Stop services: ./start.sh stop"
}

# ------------------------------------------------------------------------
# Service Management: Stop
# ------------------------------------------------------------------------
stop() {
    print_info "Stopping services..."
    $COMPOSE_CMD stop
    print_success "Services stopped"
}

# ------------------------------------------------------------------------
# Service Management: Restart
# ------------------------------------------------------------------------
restart() {
    print_info "Restarting services..."
    $COMPOSE_CMD restart
    print_success "Services restarted"
}

# ------------------------------------------------------------------------
# Monitoring: Logs
# ------------------------------------------------------------------------
logs() {
    if [ -z "$2" ]; then
        $COMPOSE_CMD logs -f
    else
        $COMPOSE_CMD logs -f "$2"
    fi
}

# ------------------------------------------------------------------------
# Monitoring: Status
# ------------------------------------------------------------------------
status() {
    read_env_vars

    print_info "Service status:"
    $COMPOSE_CMD ps
    echo ""
    print_info "Health check:"
    curl -s "http://localhost:${OKO_BACKEND_PORT}/api/health" | jq '.' || echo "Backend did not respond"
}

# ------------------------------------------------------------------------
# Maintenance: Clean (Destructive)
# ------------------------------------------------------------------------
clean() {
    print_warning "This will delete all containers and data."
    read -p "Confirm deletion? (yes/no): " confirm
    if [ "$confirm" == "yes" ]; then
        print_info "Cleaning up..."
        $COMPOSE_CMD down -v
        print_success "Cleanup completed"
    else
        print_info "Cancelled"
    fi
}

# ------------------------------------------------------------------------
# Maintenance: Update
# ------------------------------------------------------------------------
update() {
    print_info "Updating..."
    git pull
    $COMPOSE_CMD up -d --build
    print_success "Update completed"
}

# ------------------------------------------------------------------------
# Command: Regenerate all keys (force)
# ------------------------------------------------------------------------
regenerate_keys() {
    print_warning "This will regenerate every encryption key."
    print_warning "Existing encrypted data cannot be decrypted after the keys are regenerated."
    echo ""
    read -p "Confirm regeneration? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return
    fi

    check_env

    print_info "Generating new keys..."

    # Generate JWT_SECRET
    local jwt_secret=$(openssl rand -base64 32)
    set_env_var "JWT_SECRET" "$jwt_secret"
    print_success "JWT_SECRET generated"

    # Generate DATA_ENCRYPTION_KEY
    local data_key=$(openssl rand -base64 32)
    set_env_var "DATA_ENCRYPTION_KEY" "$data_key"
    print_success "DATA_ENCRYPTION_KEY generated"

    # Generate RSA_PRIVATE_KEY
    local rsa_key=$(openssl genrsa 2048 2>/dev/null | awk '{printf "%s\\n", $0}')
    set_env_var "RSA_PRIVATE_KEY" "\"$rsa_key\""
    print_success "RSA_PRIVATE_KEY generated"

    chmod 600 .env 2>/dev/null || true

    echo ""
    print_success "All keys were regenerated and saved to .env"
    print_warning "Keep the .env file secure"
}

# ------------------------------------------------------------------------
# Help: Usage Information
# ------------------------------------------------------------------------
show_help() {
    echo "OKO AI Trading System - Docker Management Script"
    echo ""
    echo "Usage: ./start.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start [--build]    Start services (optionally rebuild images)"
    echo "  stop               Stop services"
    echo "  restart            Restart services"
    echo "  logs [service]     View logs (optionally specify backend/frontend)"
    echo "  status             Show service status"
    echo "  clean              Remove all containers and data"
    echo "  update             Update the code and restart"
    echo "  regenerate-keys    Regenerate all encryption keys (use with caution)"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh start --build    # Build and start"
    echo "  ./start.sh logs backend     # View backend logs"
    echo "  ./start.sh status           # Show status"
    echo ""
    echo "First use:"
    echo "  Run ./start.sh directly; missing keys will be generated automatically"
}

# ------------------------------------------------------------------------
# Main: Command Dispatcher
# ------------------------------------------------------------------------
main() {
    check_docker

    case "${1:-start}" in
        start)
            check_env
            check_encryption
            check_database
            start "$2"
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs "$@"
            ;;
        status)
            status
            ;;
        clean)
            clean
            ;;
        update)
            update
            ;;
        regenerate-keys)
            regenerate_keys
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Execute Main
main "$@"
