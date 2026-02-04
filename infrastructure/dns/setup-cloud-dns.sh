#!/bin/bash
# Setup Cloud DNS for harishankar.info

set -e

PROJECT_ID="hse-pulse-portfolio"
ZONE_NAME="harishankar-zone"
DOMAIN="harishankar.info"

echo "=== Setting up Cloud DNS ==="

# Create managed zone
echo "Creating DNS zone..."
gcloud dns managed-zones create $ZONE_NAME \
    --dns-name="$DOMAIN." \
    --description="HSE Pulse Portfolio DNS Zone" \
    --project=$PROJECT_ID \
    2>/dev/null || echo "Zone already exists"

# Get the nameservers
echo ""
echo "=== IMPORTANT: Update your Bigrock DNS settings ==="
echo "Change nameservers from dns1-4.bigrock.in to:"
echo ""
gcloud dns managed-zones describe $ZONE_NAME \
    --project=$PROJECT_ID \
    --format="value(nameServers)" | tr ';' '\n'
echo ""

# Reserve static IP for ingress
echo "Reserving global static IP..."
gcloud compute addresses create hse-pulse-ip \
    --global \
    --project=$PROJECT_ID \
    2>/dev/null || echo "IP already reserved"

# Get the IP address
STATIC_IP=$(gcloud compute addresses describe hse-pulse-ip \
    --global \
    --project=$PROJECT_ID \
    --format="value(address)")

echo "Static IP: $STATIC_IP"

# Add DNS records
echo "Adding DNS records..."

# Root domain A record
gcloud dns record-sets create "$DOMAIN." \
    --zone=$ZONE_NAME \
    --type=A \
    --ttl=300 \
    --rrdatas="$STATIC_IP" \
    --project=$PROJECT_ID \
    2>/dev/null || echo "Root A record already exists"

# WWW CNAME
gcloud dns record-sets create "www.$DOMAIN." \
    --zone=$ZONE_NAME \
    --type=CNAME \
    --ttl=300 \
    --rrdatas="$DOMAIN." \
    --project=$PROJECT_ID \
    2>/dev/null || echo "WWW CNAME already exists"

# Demo subdomain A record
gcloud dns record-sets create "demo.$DOMAIN." \
    --zone=$ZONE_NAME \
    --type=A \
    --ttl=300 \
    --rrdatas="$STATIC_IP" \
    --project=$PROJECT_ID \
    2>/dev/null || echo "Demo A record already exists"

echo ""
echo "=== DNS Setup Complete ==="
echo ""
echo "Static IP: $STATIC_IP"
echo ""
echo "DNS Records created:"
echo "  harishankar.info      -> $STATIC_IP"
echo "  www.harishankar.info  -> harishankar.info (CNAME)"
echo "  demo.harishankar.info -> $STATIC_IP"
echo ""
echo "NEXT STEPS:"
echo "1. Go to Bigrock domain management"
echo "2. Change nameservers to the Google Cloud DNS nameservers shown above"
echo "3. Wait for DNS propagation (up to 48 hours, usually faster)"
