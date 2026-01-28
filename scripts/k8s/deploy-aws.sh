#!/bin/bash
# HSE-Pulse AWS EKS Deployment Script
# Deploys to Amazon Elastic Kubernetes Service with GPU support

set -e

echo "=========================================="
echo "HSE-Pulse AWS EKS Deployment"
echo "=========================================="

# Configuration - Set these or use environment variables
AWS_REGION=${AWS_REGION:-"eu-west-1"}
CLUSTER_NAME=${EKS_CLUSTER_NAME:-"hse-pulse-cluster"}
NODE_INSTANCE_TYPE=${EKS_NODE_TYPE:-"m5.xlarge"}
GPU_INSTANCE_TYPE=${EKS_GPU_TYPE:-"p3.2xlarge"}
MIN_NODES=${EKS_MIN_NODES:-2}
MAX_NODES=${EKS_MAX_NODES:-10}
GPU_MIN_NODES=${EKS_GPU_MIN_NODES:-0}
GPU_MAX_NODES=${EKS_GPU_MAX_NODES:-3}
ECR_REGISTRY=""

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    if ! command -v aws &> /dev/null; then
        echo "Error: AWS CLI is not installed"
        echo "Install from: https://aws.amazon.com/cli/"
        exit 1
    fi

    if ! command -v eksctl &> /dev/null; then
        echo "Installing eksctl..."
        curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
        sudo mv /tmp/eksctl /usr/local/bin
    fi

    if ! command -v kubectl &> /dev/null; then
        echo "Installing kubectl..."
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install kubectl /usr/local/bin/kubectl
    fi

    if ! command -v helm &> /dev/null; then
        echo "Installing helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi

    echo "All prerequisites installed!"
}

# Setup AWS
setup_aws() {
    echo "Setting up AWS..."

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "Please configure AWS credentials:"
        aws configure
    fi

    # Get account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

    echo "AWS Account: $AWS_ACCOUNT_ID"
    echo "ECR Registry: $ECR_REGISTRY"
}

# Create EKS cluster
create_cluster() {
    echo "Creating EKS cluster..."

    # Check if cluster exists
    if aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION &> /dev/null; then
        echo "Cluster $CLUSTER_NAME already exists. Skipping creation."
        return
    fi

    # Create cluster with eksctl
    eksctl create cluster \
        --name=$CLUSTER_NAME \
        --region=$AWS_REGION \
        --version=1.28 \
        --nodegroup-name=standard-workers \
        --node-type=$NODE_INSTANCE_TYPE \
        --nodes=2 \
        --nodes-min=$MIN_NODES \
        --nodes-max=$MAX_NODES \
        --managed \
        --asg-access \
        --with-oidc

    echo "EKS cluster created!"
}

# Add GPU node group
add_gpu_nodegroup() {
    echo "Adding GPU node group..."

    # Check if GPU node group exists
    if eksctl get nodegroup --cluster=$CLUSTER_NAME --region=$AWS_REGION --name=gpu-workers &> /dev/null; then
        echo "GPU node group already exists. Skipping."
        return
    fi

    # Create GPU node group
    eksctl create nodegroup \
        --cluster=$CLUSTER_NAME \
        --region=$AWS_REGION \
        --name=gpu-workers \
        --node-type=$GPU_INSTANCE_TYPE \
        --nodes=0 \
        --nodes-min=$GPU_MIN_NODES \
        --nodes-max=$GPU_MAX_NODES \
        --node-labels="accelerator=nvidia-gpu" \
        --node-taints="nvidia.com/gpu=present:NoSchedule"

    # Install NVIDIA device plugin
    kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.3/nvidia-device-plugin.yml

    echo "GPU node group added!"
}

# Configure kubectl
configure_kubectl() {
    echo "Configuring kubectl..."
    aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
    echo "kubectl configured!"
}

# Create ECR repositories and push images
push_images() {
    echo "Building and pushing images to ECR..."

    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

    cd "$(dirname "$0")/../.."

    for service in pulseflow careplanplus pulsenotes medisync; do
        echo "Processing $service..."

        # Create ECR repository if not exists
        aws ecr describe-repositories --repository-names hse-pulse/${service} --region $AWS_REGION &> /dev/null || \
            aws ecr create-repository --repository-name hse-pulse/${service} --region $AWS_REGION

        # Build and push
        docker build -t ${ECR_REGISTRY}/hse-pulse/${service}:latest ./services/${service}
        docker push ${ECR_REGISTRY}/hse-pulse/${service}:latest
    done

    echo "Images pushed to ECR!"
}

# Install AWS Load Balancer Controller
install_alb_controller() {
    echo "Installing AWS Load Balancer Controller..."

    # Create IAM policy for ALB controller
    curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json

    aws iam create-policy \
        --policy-name AWSLoadBalancerControllerIAMPolicy \
        --policy-document file://iam_policy.json 2>/dev/null || true

    # Create service account
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --region=$AWS_REGION \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --attach-policy-arn=arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
        --approve \
        --override-existing-serviceaccounts

    # Install controller with Helm
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update

    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller

    rm -f iam_policy.json

    echo "AWS Load Balancer Controller installed!"
}

# Deploy with Helm
deploy_helm() {
    echo "Deploying with Helm..."

    cd "$(dirname "$0")/../.."

    # Update dependencies
    helm dependency update ./helm/hse-pulse

    # Install/upgrade
    helm upgrade --install hse-pulse ./helm/hse-pulse \
        --namespace hse-pulse \
        --create-namespace \
        --set global.imageRegistry=${ECR_REGISTRY}/hse-pulse \
        --set cloudProvider.type=aws \
        --set cloudProvider.aws.region=${AWS_REGION} \
        --set training.gpu.enabled=true \
        --set ingress.annotations."alb\.ingress\.kubernetes\.io/scheme"=internet-facing \
        --set ingress.annotations."alb\.ingress\.kubernetes\.io/target-type"=ip \
        --wait

    echo "Helm deployment complete!"
}

# Show deployment status
show_status() {
    echo ""
    echo "=========================================="
    echo "HSE-Pulse EKS Deployment Complete!"
    echo "=========================================="
    echo ""
    kubectl get pods -n hse-pulse
    echo ""
    echo "Getting load balancer URL..."
    sleep 10
    ALB_URL=$(kubectl get ingress hse-pulse-ingress -n hse-pulse -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    echo "Load Balancer URL: $ALB_URL"
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods -n hse-pulse"
    echo "  kubectl logs -f deployment/pulseflow -n hse-pulse"
    echo "  kubectl port-forward svc/pulseflow-service 8000:8000 -n hse-pulse"
}

# Main
main() {
    check_prerequisites
    setup_aws
    create_cluster
    add_gpu_nodegroup
    configure_kubectl
    install_alb_controller
    push_images
    deploy_helm
    show_status
}

main "$@"
