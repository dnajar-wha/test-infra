#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ACTION="${1:-up}"
COMPOSE_FILE="docker-compose.yml"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 [command]

Commands:
    up        Start all services (default)
    down      Stop and remove all containers
    rebuild   Rebuild all images and restart
    logs      Show logs (follow mode)
    status    Show container status
    scale     Scale app1 and app2 (usage: $0 scale 3)
    clean     Remove all images and volumes (DANGER!)
    help      Show this help

Examples:
    $0 up           # Start the lab
    $0 rebuild      # Rebuild everything
    $0 scale 5      # Run 5 instances of each app
EOF
}

# Check if .env exists
check_env() {
    if [[ ! -f ".env" ]]; then
        log_warn ".env file not found. Copying from .env.example..."
        cp .env.example .env
        log_warn "Please edit .env with your settings before running commands."
    fi
}

# Start services
cmd_up() {
    log_info "Starting services..."
    docker-compose up -d --build
    log_info "Services started. Access points:"
    echo ""
    echo "  Nginx (main entry):  http://localhost:8080"
    echo "  HAProxy Stats:       http://localhost:8404/stats (admin:ad*in123)"
    echo "  Jenkins:             http://localhost:8081"
    echo ""
}

# Stop services
cmd_down() {
    log_info "Stopping services..."
    docker-compose down
    log_info "Services stopped."
}

# Rebuild everything
cmd_rebuild() {
    log_info "Rebuilding all images..."
    docker-compose build --no-cache
    docker-compose down
    docker-compose up -d
    log_info "Rebuild complete."
}

# Show logs
cmd_logs() {
    docker-compose logs -f --tail=50 "${@:2}"
}

# Show status
cmd_status() {
    echo ""
    log_info "Container Status:"
    docker-compose ps
    echo ""
    log_info "Network Status:"
    docker network ls | grep -E "nginx-haproxy|app-network" || true
    echo ""
    log_info "Disk Usage:"
    docker system df -v | head -20
}

# Scale services
cmd_scale() {
    local count="${2:-2}"
    log_info "Scaling app1 and app2 to ${count} instances..."

    # Stop current instances
    docker-compose stop app1 app2

    # Remove old containers
    docker rm -f app1 app2 2>/dev/null || true

    # Start with scale
    docker-compose up -d --scale app1=${count} --scale app2=${count}

    log_info "Scaled to ${count} instances."
}

# Clean everything (dangerous!)
cmd_clean() {
    log_warn "This will remove ALL images, containers, and volumes!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm

    if [[ "$confirm" != "yes" ]]; then
        log_info "Aborted."
        exit 0
    fi

    log_info "Stopping containers..."
    docker-compose down -v

    log_info "Removing images..."
    docker rmi -f myapp:latest 2>/dev/null || true
    docker images myapp -q | xargs -r docker rmi

    log_info "Pruning unused resources..."
    docker system prune -f

    log_info "Cleanup complete."
}

# Main
check_env

case "$ACTION" in
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    rebuild)
        cmd_rebuild
        ;;
    logs)
        cmd_logs
        ;;
    status)
        cmd_status
        ;;
    scale)
        cmd_scale "$@"
        ;;
    clean)
        cmd_clean
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $ACTION"
        usage
        exit 1
        ;;
esac
