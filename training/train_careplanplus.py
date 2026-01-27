"""
CarePlanPlus Model Training Script with MLflow Integration
BERT-based procedure sequence prediction for treatment pathway recommendations
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Any, Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

try:
    import mlflow
    import mlflow.pytorch
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("MLflow not available. Install with: pip install mlflow")

try:
    from transformers import BertModel, BertTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Transformers not available. Install with: pip install transformers")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ProcedureDataset(Dataset):
    """Dataset for procedure prediction from diagnosis sequences."""

    def __init__(self, sequences: List[str], labels: List[int], tokenizer, max_length: int = 256):
        self.sequences = sequences
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.sequences[idx],
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(self.labels[idx], dtype=torch.long)
        }


class EfficientBERTRecommender(nn.Module):
    """BERT-based recommender model for procedure prediction."""

    def __init__(self, n_procedures: int, dropout: float = 0.3, freeze_layers: int = 6):
        super().__init__()

        self.bert = BertModel.from_pretrained('bert-base-uncased')

        # Freeze early layers for efficiency
        if freeze_layers > 0:
            for param in self.bert.embeddings.parameters():
                param.requires_grad = False
            for i in range(min(freeze_layers, len(self.bert.encoder.layer))):
                for param in self.bert.encoder.layer[i].parameters():
                    param.requires_grad = False

        hidden_size = self.bert.config.hidden_size
        self.bn = nn.BatchNorm1d(hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.intermediate = nn.Linear(hidden_size, 256)
        self.classifier = nn.Linear(256, n_procedures)

        nn.init.xavier_uniform_(self.intermediate.weight)
        nn.init.xavier_uniform_(self.classifier.weight)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        x = self.bn(outputs.pooler_output)
        x = self.dropout(x)
        x = torch.relu(self.intermediate(x))
        x = self.dropout(x)
        return self.classifier(x)


def generate_synthetic_data(n_samples: int = 1000) -> pd.DataFrame:
    """Generate synthetic training data for demonstration."""

    diagnoses = [
        ("I10", "Essential hypertension"),
        ("I21.0", "Acute transmural MI anterior wall"),
        ("I25.10", "Atherosclerotic heart disease"),
        ("J44.1", "COPD with acute exacerbation"),
        ("J96.00", "Acute respiratory failure"),
        ("K92.2", "GI hemorrhage"),
        ("E11.9", "Type 2 diabetes mellitus"),
        ("N17.9", "Acute kidney failure"),
        ("I50.9", "Heart failure"),
        ("A41.9", "Sepsis"),
    ]

    procedures = [
        "0BH17ZZ", "0BH18ZZ", "02HV33Z", "5A1955Z", "5A1945Z",
        "0W9G3ZZ", "0BN70ZZ", "0BN74ZZ", "3E0G76Z", "0DB64ZZ",
        "02703DZ", "02100Z9", "5A1221Z", "0T9B70Z", "30233N1"
    ]

    data = []
    for _ in range(n_samples):
        # Random number of diagnoses (1-4)
        n_diag = np.random.randint(1, 5)
        selected_diag = np.random.choice(len(diagnoses), n_diag, replace=False)

        diag_parts = []
        for i, idx in enumerate(selected_diag):
            code, desc = diagnoses[idx]
            diag_parts.append(f"DIAG_{i+1}:{code}:{desc}")

        sequence = " [SEP] ".join(diag_parts)

        # Select procedure based on primary diagnosis (simplified logic)
        primary_diag = diagnoses[selected_diag[0]][0]
        if primary_diag.startswith('I2'):  # Cardiac
            proc_idx = np.random.choice([2, 10, 11])  # Cardiac procedures
        elif primary_diag.startswith('J'):  # Respiratory
            proc_idx = np.random.choice([0, 1, 3, 4])  # Respiratory procedures
        elif primary_diag.startswith('K'):  # GI
            proc_idx = np.random.choice([5, 8, 9])  # GI procedures
        else:
            proc_idx = np.random.randint(0, len(procedures))

        data.append({
            'sequence': sequence,
            'procedure': procedures[proc_idx]
        })

    return pd.DataFrame(data)


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    epochs: int = 10,
    learning_rate: float = 2e-5,
    log_to_mlflow: bool = True
) -> Dict[str, Any]:
    """Train the model with MLflow logging."""

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    criterion = nn.CrossEntropyLoss()
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.1)

    best_val_acc = 0.0
    history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}

    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        train_preds, train_labels = [], []

        for batch in train_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            optimizer.zero_grad()
            outputs = model(input_ids, attention_mask)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            train_preds.extend(outputs.argmax(dim=1).cpu().numpy())
            train_labels.extend(labels.cpu().numpy())

        train_loss /= len(train_loader)
        train_acc = accuracy_score(train_labels, train_preds)

        # Validation
        model.eval()
        val_loss = 0.0
        val_preds, val_labels = [], []

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                labels = batch['labels'].to(device)

                outputs = model(input_ids, attention_mask)
                loss = criterion(outputs, labels)

                val_loss += loss.item()
                val_preds.extend(outputs.argmax(dim=1).cpu().numpy())
                val_labels.extend(labels.cpu().numpy())

        val_loss /= len(val_loader)
        val_acc = accuracy_score(val_labels, val_preds)

        # Log metrics
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc)

        if MLFLOW_AVAILABLE and log_to_mlflow:
            mlflow.log_metrics({
                'train_loss': train_loss,
                'train_accuracy': train_acc,
                'val_loss': val_loss,
                'val_accuracy': val_acc
            }, step=epoch)

        logger.info(f"Epoch {epoch+1}/{epochs} - Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}, Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc

        scheduler.step()

    # Compute final metrics
    precision, recall, f1, _ = precision_recall_fscore_support(val_labels, val_preds, average='weighted')

    final_metrics = {
        'best_val_accuracy': best_val_acc,
        'final_val_accuracy': val_acc,
        'precision': precision,
        'recall': recall,
        'f1_score': f1
    }

    if MLFLOW_AVAILABLE and log_to_mlflow:
        mlflow.log_metrics(final_metrics)

    return {**final_metrics, 'history': history}


def main():
    parser = argparse.ArgumentParser(description='Train CarePlanPlus BERT model')
    parser.add_argument('--epochs', type=int, default=5, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size')
    parser.add_argument('--learning-rate', type=float, default=2e-5, help='Learning rate')
    parser.add_argument('--n-samples', type=int, default=500, help='Number of synthetic samples')
    parser.add_argument('--output-dir', type=str, default='../models/careplanplus', help='Output directory')
    parser.add_argument('--mlflow-uri', type=str, default='http://localhost:5000', help='MLflow tracking URI')
    parser.add_argument('--experiment-name', type=str, default='CarePlanPlus-BERT', help='MLflow experiment name')
    args = parser.parse_args()

    # Setup device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")

    # Setup MLflow
    if MLFLOW_AVAILABLE:
        mlflow.set_tracking_uri(args.mlflow_uri)
        mlflow.set_experiment(args.experiment_name)
        logger.info(f"MLflow tracking URI: {args.mlflow_uri}")

    # Generate or load data
    logger.info(f"Generating {args.n_samples} synthetic training samples...")
    df = generate_synthetic_data(args.n_samples)

    # Encode labels
    label_encoder = LabelEncoder()
    df['label'] = label_encoder.fit_transform(df['procedure'])
    n_procedures = len(label_encoder.classes_)
    logger.info(f"Number of procedure classes: {n_procedures}")

    # Split data
    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)

    # Initialize tokenizer
    if not TRANSFORMERS_AVAILABLE:
        logger.error("Transformers library required for training")
        sys.exit(1)

    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

    # Create datasets
    train_dataset = ProcedureDataset(
        train_df['sequence'].tolist(),
        train_df['label'].tolist(),
        tokenizer
    )
    val_dataset = ProcedureDataset(
        val_df['sequence'].tolist(),
        val_df['label'].tolist(),
        tokenizer
    )

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)

    # Initialize model
    model = EfficientBERTRecommender(n_procedures=n_procedures).to(device)

    # Start MLflow run
    run_name = f"careplanplus-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    with mlflow.start_run(run_name=run_name) if MLFLOW_AVAILABLE else nullcontext():
        # Log parameters
        if MLFLOW_AVAILABLE:
            mlflow.log_params({
                'epochs': args.epochs,
                'batch_size': args.batch_size,
                'learning_rate': args.learning_rate,
                'n_samples': args.n_samples,
                'n_procedures': n_procedures,
                'model_type': 'BERT-Recommender',
                'freeze_layers': 6
            })

        # Train model
        logger.info("Starting training...")
        metrics = train_model(
            model, train_loader, val_loader, device,
            epochs=args.epochs,
            learning_rate=args.learning_rate,
            log_to_mlflow=MLFLOW_AVAILABLE
        )

        # Save model
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, 'bert_model.pth')

        checkpoint = {
            'model_state_dict': model.state_dict(),
            'n_procedures': n_procedures,
            'procedure_classes': label_encoder.classes_.tolist()
        }
        torch.save(checkpoint, model_path)
        logger.info(f"Model saved to {model_path}")

        # Log model to MLflow
        if MLFLOW_AVAILABLE:
            mlflow.pytorch.log_model(model, "model")
            mlflow.log_artifact(model_path)

            # Log procedure mapping
            proc_mapping = {proc: i for i, proc in enumerate(label_encoder.classes_)}
            with open(os.path.join(args.output_dir, 'procedure_mapping.json'), 'w') as f:
                json.dump(proc_mapping, f, indent=2)
            mlflow.log_artifact(os.path.join(args.output_dir, 'procedure_mapping.json'))

        logger.info(f"Training complete. Final metrics: {metrics}")

        return metrics


class nullcontext:
    """Null context manager for Python < 3.7 compatibility."""
    def __enter__(self):
        return None
    def __exit__(self, *args):
        return False


if __name__ == '__main__':
    main()
