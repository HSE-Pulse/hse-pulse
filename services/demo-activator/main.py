"""
Demo Activator Service
Scales up demo pods on demand and scales down after inactivity
"""
import os
import asyncio
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from kubernetes import client, config
import threading

app = FastAPI()

# Configuration
NAMESPACE = os.getenv("NAMESPACE", "hse-pulse")
SCALE_DOWN_AFTER_MINUTES = int(os.getenv("SCALE_DOWN_AFTER_MINUTES", "10"))

# Track last access time for each service
last_access = {}
lock = threading.Lock()

# Service configurations
SERVICES = {
    "medisync": {
        "deployment": "medisync",
        "url": "https://medisync.harishankar.info",
        "name": "MediSync DES-MARL",
        "description": "Multi-Agent RL for Hospital Resource Optimisation"
    },
    "pulseflow": {
        "deployment": "pulseflow",
        "url": "https://pulseflow.harishankar.info",
        "name": "PulseFlow",
        "description": "Patient Flow Prediction with LSTM"
    },
    "pulsenotes": {
        "deployment": "pulsenotes",
        "url": "https://pulsenotes.harishankar.info",
        "name": "PulseNotes",
        "description": "Clinical Notes Analysis with Bio-ClinicalBERT"
    },
    "careplanplus": {
        "deployment": "careplanplus",
        "url": "https://careplanplus.harishankar.info",
        "name": "CarePlanPlus",
        "description": "Treatment Pathway Recommendations with BERT"
    }
}

def get_k8s_client():
    """Get Kubernetes API client"""
    try:
        config.load_incluster_config()
    except:
        config.load_kube_config()
    return client.AppsV1Api()

def get_deployment_replicas(deployment_name: str) -> int:
    """Get current replica count"""
    try:
        k8s = get_k8s_client()
        deployment = k8s.read_namespaced_deployment(deployment_name, NAMESPACE)
        return deployment.spec.replicas or 0
    except Exception as e:
        print(f"Error getting replicas: {e}")
        return 0

def scale_deployment(deployment_name: str, replicas: int):
    """Scale deployment to specified replicas"""
    try:
        k8s = get_k8s_client()
        body = {"spec": {"replicas": replicas}}
        k8s.patch_namespaced_deployment_scale(deployment_name, NAMESPACE, body)
        print(f"Scaled {deployment_name} to {replicas} replicas")
    except Exception as e:
        print(f"Error scaling deployment: {e}")

def is_deployment_ready(deployment_name: str) -> bool:
    """Check if deployment has ready replicas"""
    try:
        k8s = get_k8s_client()
        deployment = k8s.read_namespaced_deployment(deployment_name, NAMESPACE)
        ready = deployment.status.ready_replicas or 0
        desired = deployment.spec.replicas or 0
        return ready >= desired and desired > 0
    except Exception as e:
        print(f"Error checking deployment: {e}")
        return False

async def wait_for_ready(deployment_name: str, timeout: int = 180) -> bool:
    """Wait for deployment to be ready"""
    start = time.time()
    while time.time() - start < timeout:
        if is_deployment_ready(deployment_name):
            return True
        await asyncio.sleep(2)
    return False

def scale_down_inactive():
    """Background task to scale down inactive services"""
    while True:
        time.sleep(60)  # Check every minute
        now = datetime.now()
        with lock:
            for service_id, service in SERVICES.items():
                if service_id in last_access:
                    elapsed = now - last_access[service_id]
                    if elapsed > timedelta(minutes=SCALE_DOWN_AFTER_MINUTES):
                        replicas = get_deployment_replicas(service["deployment"])
                        if replicas > 0:
                            print(f"Scaling down {service_id} due to inactivity")
                            scale_deployment(service["deployment"], 0)
                            del last_access[service_id]

# Start background scale-down thread
threading.Thread(target=scale_down_inactive, daemon=True).start()

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/activate/{service_id}")
async def activate(service_id: str, request: Request):
    """Activate a demo service"""
    if service_id not in SERVICES:
        return HTMLResponse(content="<h1>Service not found</h1>", status_code=404)

    service = SERVICES[service_id]
    deployment = service["deployment"]

    # Update last access time
    with lock:
        last_access[service_id] = datetime.now()

    # Check if already running
    if is_deployment_ready(deployment):
        return RedirectResponse(url=service["url"], status_code=302)

    # Scale up
    current = get_deployment_replicas(deployment)
    if current == 0:
        scale_deployment(deployment, 1)

    # Return loading page
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Starting {service["name"]}...</title>
        <meta http-equiv="refresh" content="3">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
            }}
            .container {{
                text-align: center;
                padding: 40px;
            }}
            .spinner {{
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.2);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                to {{ transform: rotate(360deg); }}
            }}
            h1 {{ font-size: 2rem; margin-bottom: 10px; }}
            p {{ color: #94a3b8; font-size: 1.1rem; }}
            .note {{ font-size: 0.9rem; margin-top: 30px; color: #64748b; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Starting {service["name"]}</h1>
            <div class="spinner"></div>
            <p>{service["description"]}</p>
            <p class="note">This demo runs on-demand to save resources.<br>It will be ready in ~30-60 seconds.</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/status/{service_id}")
def status(service_id: str):
    """Get service status"""
    if service_id not in SERVICES:
        return {"error": "Service not found"}

    service = SERVICES[service_id]
    ready = is_deployment_ready(service["deployment"])
    replicas = get_deployment_replicas(service["deployment"])

    return {
        "service": service_id,
        "ready": ready,
        "replicas": replicas,
        "url": service["url"] if ready else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
