#!/bin/bash
# ─────────────────────────────────────────────────────────────
# SocialPulse AI — Fresh VPS Setup (Ubuntu 20.04/22.04)
# Run as root: bash scripts/setup-vps.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()     { echo -e "${BLUE}[setup] $1${NC}"; }
success() { echo -e "${GREEN}[✓] $1${NC}"; }
warn()    { echo -e "${YELLOW}[!] $1${NC}"; }

echo -e "${GREEN}"
echo "  SocialPulse AI — VPS Setup Script"
echo "  Ubuntu 20.04 / 22.04"
echo -e "${NC}"

# ─── System Updates ───────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
success "System updated"

# ─── Install Docker ───────────────────────────────────────────
log "Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  success "Docker installed"
else
  success "Docker already installed"
fi

# ─── Install Docker Compose ───────────────────────────────────
log "Installing Docker Compose..."
if ! command -v docker-compose &>/dev/null; then
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
  curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  success "Docker Compose installed: $COMPOSE_VERSION"
else
  success "Docker Compose already installed"
fi

# ─── UFW Firewall ─────────────────────────────────────────────
log "Configuring firewall..."
apt-get install -y -qq ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
success "Firewall configured (22, 80, 443)"

# ─── Install Certbot (Let's Encrypt) ──────────────────────────
log "Installing Certbot for SSL..."
apt-get install -y -qq certbot
success "Certbot installed"

# ─── Create app directory ─────────────────────────────────────
log "Creating app directory..."
mkdir -p /opt/socialpulse
success "App directory: /opt/socialpulse"

# ─── System optimizations ─────────────────────────────────────
log "Applying system optimizations..."
cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10
EOF
sysctl -p > /dev/null 2>&1
success "System optimized"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗"
echo -e "║        VPS Setup Complete! ✅              ║"
echo -e "╠════════════════════════════════════════════╣"
echo -e "║  Next steps:                               ║"
echo -e "║  1. Upload project to /opt/socialpulse     ║"
echo -e "║  2. cd /opt/socialpulse                    ║"
echo -e "║  3. cp .env.example .env                   ║"
echo -e "║  4. Edit .env with your API key & domain   ║"
echo -e "║  5. Get SSL: certbot certonly --standalone ║"
echo -e "║     -d yourdomain.com                      ║"
echo -e "║  6. Copy certs to nginx/ssl/               ║"
echo -e "║  7. bash scripts/deploy.sh                 ║"
echo -e "╚════════════════════════════════════════════╝${NC}"
