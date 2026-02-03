"""
HSE-Pulse Demo Orchestrator Cloud Function

Handles on-demand spin-up of ML demo services on Cloud Run.
Services scale to zero when idle to minimize costs.
"""

import functions_framework
from flask import jsonify, Response
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = os.environ.get('PROJECT_ID', 'hse-pulse-portfolio')
REGION = os.environ.get('REGION', 'europe-west1')

# Service configurations with resource requirements
SERVICES = {
    'careplanplus': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/careplanplus:latest',
        'memory': '2Gi',
        'cpu': '2',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 2,
        'description': 'BERT-based nursing intervention recommendations',
    },
    'pulsenotes': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/pulsenotes:latest',
        'memory': '1Gi',
        'cpu': '1',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 2,
        'description': 'ClinicalBERT RAG pipeline for clinical notes',
    },
    'pulseflow': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/pulseflow:latest',
        'memory': '512Mi',
        'cpu': '1',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 2,
        'description': 'LSTM-based trolley wait time forecasting',
    },
    'medisync': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/medisync:latest',
        'memory': '1Gi',
        'cpu': '1',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 2,
        'description': 'Multi-agent RL hospital resource optimization',
    },
}


def get_cors_headers() -> dict:
    """Return CORS headers for cross-origin requests."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
    }


def json_response(data: dict, status: int = 200) -> tuple:
    """Create a JSON response with CORS headers."""
    return (jsonify(data), status, get_cors_headers())


@functions_framework.http
def demo_orchestrator(request) -> tuple:
    """
    Main entry point for demo orchestration.

    Handles:
    - GET /demo-orchestrator?service=<name> - Check service status
    - POST /demo-orchestrator?service=<name> - Spin up service

    Returns:
    - JSON response with service status and URL
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return ('', 204, get_cors_headers())

    # Get service name from query params or JSON body
    service_name = request.args.get('service')
    if not service_name and request.is_json:
        service_name = request.json.get('service')

    if not service_name:
        return json_response({
            'error': 'Missing required parameter: service',
            'available_services': list(SERVICES.keys())
        }, 400)

    if service_name not in SERVICES:
        return json_response({
            'error': f'Unknown service: {service_name}',
            'available_services': list(SERVICES.keys())
        }, 404)

    try:
        from google.cloud import run_v2

        client = run_v2.ServicesClient()
        service_path = f'projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}'

        # Check if service exists and is ready
        try:
            service = client.get_service(name=service_path)

            if service.latest_ready_revision:
                logger.info(f'Service {service_name} is ready at {service.uri}')
                return json_response({
                    'status': 'ready',
                    'service': service_name,
                    'url': service.uri,
                    'description': SERVICES[service_name]['description'],
                    'message': 'Service is running and ready'
                })
            else:
                logger.info(f'Service {service_name} exists but not ready')
                return json_response({
                    'status': 'starting',
                    'service': service_name,
                    'message': 'Service is starting up, please wait...'
                }, 202)

        except Exception as e:
            if 'not found' in str(e).lower() or '404' in str(e):
                # Service doesn't exist, need to deploy
                logger.info(f'Service {service_name} not found, deploying...')
                return deploy_service(client, service_name)
            else:
                raise

    except ImportError:
        logger.error('google-cloud-run not installed')
        return json_response({
            'error': 'Cloud Run client not available',
            'status': 'error'
        }, 500)

    except Exception as e:
        logger.error(f'Error checking service {service_name}: {str(e)}')
        return json_response({
            'status': 'error',
            'service': service_name,
            'error': str(e)
        }, 500)


def deploy_service(client, service_name: str) -> tuple:
    """Deploy a new Cloud Run service."""
    from google.cloud import run_v2

    config = SERVICES[service_name]

    try:
        # Create service configuration
        container = run_v2.Container(
            image=config['image'],
            ports=[run_v2.ContainerPort(container_port=config['port'])],
            resources=run_v2.ResourceRequirements(
                limits={
                    'memory': config['memory'],
                    'cpu': config['cpu']
                }
            )
        )

        template = run_v2.RevisionTemplate(
            containers=[container],
            scaling=run_v2.RevisionScaling(
                min_instance_count=config['min_instances'],
                max_instance_count=config['max_instances']
            ),
            timeout=f"{config['timeout']}s"
        )

        service = run_v2.Service(template=template)

        # Deploy service
        operation = client.create_service(
            parent=f'projects/{PROJECT_ID}/locations/{REGION}',
            service=service,
            service_id=service_name
        )

        logger.info(f'Deployment started for {service_name}')

        # Don't wait for completion, return immediately
        return json_response({
            'status': 'deploying',
            'service': service_name,
            'description': config['description'],
            'message': 'Service is being deployed. Please check status in 30-60 seconds.'
        }, 202)

    except Exception as e:
        logger.error(f'Failed to deploy {service_name}: {str(e)}')
        return json_response({
            'status': 'error',
            'service': service_name,
            'error': f'Deployment failed: {str(e)}'
        }, 500)


@functions_framework.http
def check_status(request) -> tuple:
    """
    Check the status of a demo service.

    GET /check-status?service=<name>
    """
    if request.method == 'OPTIONS':
        return ('', 204, get_cors_headers())

    service_name = request.args.get('service')

    if not service_name:
        return json_response({
            'error': 'Missing required parameter: service'
        }, 400)

    if service_name not in SERVICES:
        return json_response({
            'error': f'Unknown service: {service_name}'
        }, 404)

    try:
        from google.cloud import run_v2

        client = run_v2.ServicesClient()
        service_path = f'projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}'

        service = client.get_service(name=service_path)
        is_ready = service.latest_ready_revision is not None

        return json_response({
            'service': service_name,
            'status': 'ready' if is_ready else 'starting',
            'url': service.uri if is_ready else None,
            'description': SERVICES[service_name]['description']
        })

    except Exception as e:
        if 'not found' in str(e).lower() or '404' in str(e):
            return json_response({
                'service': service_name,
                'status': 'stopped',
                'url': None,
                'message': 'Service is not deployed'
            })
        else:
            logger.error(f'Error checking status for {service_name}: {str(e)}')
            return json_response({
                'service': service_name,
                'status': 'error',
                'error': str(e)
            }, 500)


@functions_framework.http
def list_services(request) -> tuple:
    """
    List all available demo services.

    GET /list-services
    """
    if request.method == 'OPTIONS':
        return ('', 204, get_cors_headers())

    services_info = []
    for name, config in SERVICES.items():
        services_info.append({
            'name': name,
            'description': config['description'],
            'resources': {
                'memory': config['memory'],
                'cpu': config['cpu']
            }
        })

    return json_response({
        'services': services_info,
        'total': len(services_info)
    })
