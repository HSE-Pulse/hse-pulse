#!/bin/bash
# SSL Setup Script for GCP VM
# Uses Let's Encrypt for free SSL certificates

set -e

DOMAIN=${1:-"example.com"}
EMAIL=${2:-"admin@example.com"}

echo "Setting up SSL for domain: $DOMAIN"

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx || true

# Run certbot in standalone mode
docker run -it --rm \
    -v ./proxy/certs:/etc/letsencrypt \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# Update nginx config with domain
sed -i "s/\${DOMAIN:-localhost}/$DOMAIN/g" proxy/nginx.prod.conf

# Restart nginx
docker-compose -f docker-compose.prod.yml up -d nginx

echo "SSL setup complete!"
echo "Your site is now available at: https://$DOMAIN"
