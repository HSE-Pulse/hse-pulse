#!/bin/bash
# HSE-Pulse Training Job Launcher
# Launches GPU-enabled training jobs on demand

set -e

NAMESPACE=${NAMESPACE:-hse-pulse}
SERVICE=${1:-""}
EPOCHS=${2:-""}
BATCH_SIZE=${3:-""}

usage() {
    echo "Usage: $0 <service> [epochs] [batch_size]"
    echo ""
    echo "Services:"
    echo "  pulseflow    - LSTM patient flow prediction training"
    echo "  careplanplus - BERT procedure prediction training"
    echo "  medisync     - MADDPG reinforcement learning training"
    echo "  pulsenotes   - Clinical NLP model training"
    echo ""
    echo "Examples:"
    echo "  $0 pulseflow 100 64"
    echo "  $0 careplanplus 10 16"
    echo "  $0 medisync 10000 256"
    exit 1
}

check_gpu_available() {
    echo "Checking GPU availability..."
    GPU_NODES=$(kubectl get nodes -l accelerator=nvidia-gpu --no-headers 2>/dev/null | wc -l)

    if [ "$GPU_NODES" -eq 0 ]; then
        echo "Warning: No GPU nodes found in cluster."
        echo "Training will be scheduled when GPU node scales up."
        read -p "Continue? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        echo "Found $GPU_NODES GPU node(s)"
    fi
}

launch_pulseflow_training() {
    EPOCHS=${EPOCHS:-100}
    BATCH_SIZE=${BATCH_SIZE:-64}

    echo "Launching PulseFlow training job..."
    echo "  Epochs: $EPOCHS"
    echo "  Batch Size: $BATCH_SIZE"

    JOB_NAME="pulseflow-training-$(date +%Y%m%d-%H%M%S)"

    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: $JOB_NAME
  namespace: $NAMESPACE
  labels:
    app: pulseflow-training
    component: training
spec:
  backoffLimit: 2
  ttlSecondsAfterFinished: 86400
  template:
    metadata:
      labels:
        app: pulseflow-training
    spec:
      restartPolicy: OnFailure
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
        - name: trainer
          image: hse-pulse/pulseflow:latest
          imagePullPolicy: Always
          command: ["python", "-m", "training.train_pulseflow"]
          args:
            - "--epochs=$EPOCHS"
            - "--batch-size=$BATCH_SIZE"
            - "--learning-rate=0.001"
          env:
            - name: DEVICE
              value: "cuda"
            - name: MLFLOW_TRACKING_URI
              value: "http://mlflow-service:5000"
            - name: MLFLOW_EXPERIMENT_NAME
              value: "pulseflow-lstm"
          envFrom:
            - configMapRef:
                name: hse-pulse-config
          resources:
            requests:
              memory: "8Gi"
              cpu: "2000m"
              nvidia.com/gpu: "1"
            limits:
              memory: "16Gi"
              cpu: "4000m"
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: models
              mountPath: /app/models
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: models-pvc
EOF

    echo "Job $JOB_NAME launched!"
    echo "Monitor with: kubectl logs -f job/$JOB_NAME -n $NAMESPACE"
}

launch_careplanplus_training() {
    EPOCHS=${EPOCHS:-10}
    BATCH_SIZE=${BATCH_SIZE:-16}

    echo "Launching CarePlanPlus training job..."
    echo "  Epochs: $EPOCHS"
    echo "  Batch Size: $BATCH_SIZE"

    JOB_NAME="careplanplus-training-$(date +%Y%m%d-%H%M%S)"

    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: $JOB_NAME
  namespace: $NAMESPACE
  labels:
    app: careplanplus-training
    component: training
spec:
  backoffLimit: 2
  ttlSecondsAfterFinished: 86400
  template:
    metadata:
      labels:
        app: careplanplus-training
    spec:
      restartPolicy: OnFailure
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
        - name: trainer
          image: hse-pulse/careplanplus:latest
          imagePullPolicy: Always
          command: ["python", "-m", "training.train_careplanplus"]
          args:
            - "--epochs=$EPOCHS"
            - "--batch-size=$BATCH_SIZE"
            - "--learning-rate=2e-5"
          env:
            - name: DEVICE
              value: "cuda"
            - name: MLFLOW_TRACKING_URI
              value: "http://mlflow-service:5000"
            - name: MLFLOW_EXPERIMENT_NAME
              value: "careplanplus-bert"
          envFrom:
            - configMapRef:
                name: hse-pulse-config
          resources:
            requests:
              memory: "16Gi"
              cpu: "4000m"
              nvidia.com/gpu: "1"
            limits:
              memory: "32Gi"
              cpu: "8000m"
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: models
              mountPath: /app/models
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: models-pvc
EOF

    echo "Job $JOB_NAME launched!"
    echo "Monitor with: kubectl logs -f job/$JOB_NAME -n $NAMESPACE"
}

launch_medisync_training() {
    EPISODES=${EPOCHS:-10000}
    BATCH_SIZE=${BATCH_SIZE:-256}

    echo "Launching MediSync training job..."
    echo "  Episodes: $EPISODES"
    echo "  Batch Size: $BATCH_SIZE"

    JOB_NAME="medisync-training-$(date +%Y%m%d-%H%M%S)"

    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: $JOB_NAME
  namespace: $NAMESPACE
  labels:
    app: medisync-training
    component: training
spec:
  backoffLimit: 2
  ttlSecondsAfterFinished: 86400
  template:
    metadata:
      labels:
        app: medisync-training
    spec:
      restartPolicy: OnFailure
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
        - name: trainer
          image: hse-pulse/medisync:latest
          imagePullPolicy: Always
          command: ["python", "-m", "training.train_medisync"]
          args:
            - "--episodes=$EPISODES"
            - "--batch-size=$BATCH_SIZE"
          env:
            - name: DEVICE
              value: "cuda"
            - name: MLFLOW_TRACKING_URI
              value: "http://mlflow-service:5000"
            - name: MLFLOW_EXPERIMENT_NAME
              value: "medisync-maddpg"
          envFrom:
            - configMapRef:
                name: hse-pulse-config
          resources:
            requests:
              memory: "8Gi"
              cpu: "2000m"
              nvidia.com/gpu: "1"
            limits:
              memory: "16Gi"
              cpu: "4000m"
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: models
              mountPath: /app/models
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: models-pvc
EOF

    echo "Job $JOB_NAME launched!"
    echo "Monitor with: kubectl logs -f job/$JOB_NAME -n $NAMESPACE"
}

list_training_jobs() {
    echo "Current training jobs:"
    kubectl get jobs -n $NAMESPACE -l component=training
}

# Main
if [ -z "$SERVICE" ]; then
    usage
fi

check_gpu_available

case $SERVICE in
    pulseflow)
        launch_pulseflow_training
        ;;
    careplanplus)
        launch_careplanplus_training
        ;;
    medisync)
        launch_medisync_training
        ;;
    list)
        list_training_jobs
        ;;
    *)
        echo "Unknown service: $SERVICE"
        usage
        ;;
esac
