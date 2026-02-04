@echo off
REM Master GKE Deployment Script for Windows
REM Run this from PowerShell or Command Prompt

setlocal enabledelayedexpansion

set PROJECT_ID=hse-pulse-portfolio
set REGION=europe-west1
set CLUSTER_NAME=hse-pulse-cluster
set ZONE_NAME=harishankar-zone
set DOMAIN=harishankar.info

echo ========================================
echo HSE Pulse GKE Deployment
echo ========================================
echo.

REM Step 1: Decommission Cloud Run
echo [Step 1/7] Decommissioning Cloud Run services...
call gcloud run services delete landing --region=%REGION% --project=%PROJECT_ID% --quiet 2>nul
call gcloud run services delete medisync --region=%REGION% --project=%PROJECT_ID% --quiet 2>nul
call gcloud run services delete pulseflow --region=%REGION% --project=%PROJECT_ID% --quiet 2>nul
echo Cloud Run services deleted.
echo.

REM Step 2: Enable APIs
echo [Step 2/7] Enabling required APIs...
call gcloud services enable container.googleapis.com --project=%PROJECT_ID%
call gcloud services enable dns.googleapis.com --project=%PROJECT_ID%
echo APIs enabled.
echo.

REM Step 3: Create GKE Cluster
echo [Step 3/7] Creating GKE Autopilot cluster (this takes 5-10 minutes)...
call gcloud container clusters create-auto %CLUSTER_NAME% --region=%REGION% --project=%PROJECT_ID% --release-channel=regular
echo Cluster created.
echo.

REM Step 4: Get cluster credentials
echo [Step 4/7] Getting cluster credentials...
call gcloud container clusters get-credentials %CLUSTER_NAME% --region=%REGION% --project=%PROJECT_ID%
echo.

REM Step 5: Setup DNS
echo [Step 5/7] Setting up Cloud DNS...
call gcloud dns managed-zones create %ZONE_NAME% --dns-name="%DOMAIN%." --description="HSE Pulse Portfolio" --project=%PROJECT_ID% 2>nul

REM Reserve static IP
call gcloud compute addresses create hse-pulse-ip --global --project=%PROJECT_ID% 2>nul

REM Get static IP
for /f "tokens=*" %%i in ('gcloud compute addresses describe hse-pulse-ip --global --project=%PROJECT_ID% --format="value(address)"') do set STATIC_IP=%%i
echo Static IP: %STATIC_IP%

REM Add DNS records
call gcloud dns record-sets create "%DOMAIN%." --zone=%ZONE_NAME% --type=A --ttl=300 --rrdatas="%STATIC_IP%" --project=%PROJECT_ID% 2>nul
call gcloud dns record-sets create "www.%DOMAIN%." --zone=%ZONE_NAME% --type=CNAME --ttl=300 --rrdatas="%DOMAIN%." --project=%PROJECT_ID% 2>nul
call gcloud dns record-sets create "demo.%DOMAIN%." --zone=%ZONE_NAME% --type=A --ttl=300 --rrdatas="%STATIC_IP%" --project=%PROJECT_ID% 2>nul
echo DNS configured.
echo.

REM Step 6: Deploy to Kubernetes
echo [Step 6/7] Deploying services to GKE...
cd /d %~dp0

kubectl apply -f namespace.yaml
kubectl apply -f landing\deployment.yaml
kubectl apply -f medisync\deployment.yaml
kubectl apply -f pulseflow\deployment.yaml
kubectl apply -f ingress.yaml
echo Services deployed.
echo.

REM Step 7: Wait and verify
echo [Step 7/7] Waiting for landing page...
kubectl rollout status deployment/landing -n hse-pulse --timeout=300s
echo.

echo ========================================
echo DEPLOYMENT COMPLETE
echo ========================================
echo.
echo Static IP: %STATIC_IP%
echo.
echo IMPORTANT - Update Bigrock Nameservers:
echo.
call gcloud dns managed-zones describe %ZONE_NAME% --project=%PROJECT_ID% --format="value(nameServers)"
echo.
echo URLs (after DNS propagation):
echo   https://harishankar.info
echo   https://demo.harishankar.info/medisync
echo   https://demo.harishankar.info/pulseflow
echo.
echo Check certificate status:
echo   kubectl describe managedcertificate hse-pulse-cert -n hse-pulse
echo.
pause
