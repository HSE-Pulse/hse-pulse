#!/bin/bash
# GCP VM Initial Setup Script
# Run this on a fresh Ubuntu 22.04 VM

set -e

echo "=== Healthcare ML Portfolio - GCP VM Setup ==="

# Update system
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
echo "Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Install helpful tools
echo "Installing additional tools..."
sudo apt-get install -y git htop vim jq

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# Create application directory
echo "Setting up application directory..."
mkdir -p ~/portfolio-ml-health
cd ~/portfolio-ml-health

# Clone repository (user needs to provide URL)
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Log out and log back in (for docker group)"
echo "2. Clone the repository:"
echo "   git clone https://github.com/HSE-Pulse/portfolio-ml-health.git ~/portfolio-ml-health"
echo "3. Configure environment:"
echo "   cd ~/portfolio-ml-health && cp env.example .env.prod && nano .env.prod"
echo "4. Deploy:"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo "5. Setup SSL (optional):"
echo "   ./infrastructure/gcp/setup-ssl.sh your-domain.com your-email@example.com"
