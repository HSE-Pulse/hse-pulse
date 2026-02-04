#!/bin/bash
# Setup CI/CD with Cloud Build triggers

PROJECT_ID="hse-pulse-portfolio"
REGION="europe-west1"
REPO_NAME="hse-pulse"  # Your GitHub repo name
GITHUB_OWNER="HSE-Pulse"  # Your GitHub org/user

echo "=== Setting up CI/CD for HSE-Pulse ==="

# 1. Grant Cloud Build permissions to deploy to GKE
echo "Granting Cloud Build permissions..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/container.developer"

# 2. Connect GitHub repo (manual step required)
echo ""
echo "=== MANUAL STEP REQUIRED ==="
echo "1. Go to: https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
echo "2. Click 'Connect Repository'"
echo "3. Select 'GitHub' and authenticate"
echo "4. Select repository: $GITHUB_OWNER/$REPO_NAME"
echo ""
read -p "Press Enter after connecting the repository..."

# 3. Create build trigger
echo "Creating build trigger..."
gcloud builds triggers create github \
    --name="hse-pulse-deploy" \
    --repo-name=$REPO_NAME \
    --repo-owner=$GITHUB_OWNER \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --project=$PROJECT_ID

echo ""
echo "=== CI/CD Setup Complete ==="
echo "Now any push to main branch will trigger automatic deployment!"
