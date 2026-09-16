#!/bin/bash
# ==============================================================================
# STAGE Oracle Cloud Infrastructure (OCI) Ampere Always Free Deployment Script
# Target OS: Ubuntu 22.04 / 24.04 LTS (ARM64 / aarch64)
# ==============================================================================

set -e

echo "🚀 Starting STAGE Oracle Cloud Deployment Setup..."

# 1. Update OS Packages & Install Prerequisites
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw iptables ca-certificates gnupg lsb-release

# 2. Fix Ubuntu IPTables Firewall Rules on OCI
echo "🛡️ Configuring Oracle Cloud OS Firewall rules for Ports 80, 443, 8765..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8765 -j ACCEPT
sudo netfilter-persistent save || true

# 3. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# 4. Verify Docker Compose Plugin
if ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 5. Environment Variables Check
if [ ! -f .env ]; then
    echo "⚠️ Creating default .env configuration file..."
    cat <<EOT > .env
POSTGRES_DB=stage_db
POSTGRES_USER=stage_user
POSTGRES_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
CORS_ORIGINS=https://pixel-mark.onrender.com,http://localhost:3000,http://130.210.12.40
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-""}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-""}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-""}
GROQ_API_KEY=${GROQ_API_KEY:-""}
PROVIDER_SECRETS_ENCRYPTION_KEY=${PROVIDER_SECRETS_ENCRYPTION_KEY:-""}
SMTP_PASSWORD=${SMTP_PASSWORD:-""}
SMTP_USERNAME=${SMTP_USERNAME:-"stage2026@gmail.com"}
FIREBASE_API_KEY=${FIREBASE_API_KEY:-""}
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-"stage-42a45"}
STAGE_FOUNDER_EMAIL=saumya@entrext.com
STAGE_FOUNDER_EMAILS=saumyavishwam@gmail.com,saumya@entrext.com,saumyapatel25@gmail.com
EOT
    echo "✅ Generated new secure passwords and environment in .env file."
fi

# 6. Build and Launch Stack
echo "⚙️ Building and starting STAGE stack on Oracle Cloud..."
sudo docker compose -f docker-compose.oracle.yml up -d --build

echo "================================================================="
echo "🎉 STAGE Backend & PostgreSQL are now live on Oracle Cloud!"
echo "📍 Backend Health Check: http://localhost:8765/health"
echo "📊 PostgreSQL Container: stage_oracle_postgres (Port 5432)"
echo "================================================================="
