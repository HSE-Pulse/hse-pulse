#!/usr/bin/env python3
"""
CarePlanPlus Training Script
BERT-based treatment pathway recommender
"""

import os
import argparse
import logging
from datetime import datetime
from pathlib import Path
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, StratifiedShuffleSplit
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from tqdm import tqdm
from pymongo import MongoClient
import joblib

import math

try:
    from transformers import BertModel, BertTokenizer, get_linear_schedule_with_warmup
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.warning("Transformers not available")

try:
    import mlflow
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ProcedureDataset(Dataset):
    """Dataset for procedure prediction."""

    def __init__(self, sequences, targets, tokenizer, max_length=256):
        self.tokenized_data = []
        for i, sequence in enumerate(sequences):
            encoding = tokenizer(
                str(sequence), truncation=True, padding='max_length',
                max_length=max_length, return_tensors='pt'
            )
            self.tokenized_data.append({
                'input_ids': encoding['input_ids'].flatten(),
                'attention_mask': encoding['attention_mask'].flatten(),
                'target': torch.tensor(targets[i], dtype=torch.long)
            })

    def __len__(self):
        return len(self.tokenized_data)

    def __getitem__(self, idx):
        return self.tokenized_data[idx]


class EfficientBERTRecommender(nn.Module):
    """BERT-based recommender model."""

    def __init__(self, n_procedures, dropout=0.3, freeze_layers=6):
        super().__init__()
        self.bert = BertModel.from_pretrained('bert-base-uncased')

        if freeze_layers > 0:
            for param in self.bert.embeddings.parameters():
                param.requires_grad = False
            for i in range(freeze_layers):
                for param in self.bert.encoder.layer[i].parameters():
                    param.requires_grad = False

        self.bn = nn.BatchNorm1d(self.bert.config.hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.intermediate = nn.Linear(self.bert.config.hidden_size, 256)
        self.classifier = nn.Linear(256, n_procedures)

        nn.init.xavier_uniform_(self.intermediate.weight)
        nn.init.xavier_uniform_(self.classifier.weight)

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        x = self.bn(outputs.pooler_output)
        x = self.dropout(x)
        x = torch.relu(self.intermediate(x))
        x = self.dropout(x)
        return self.classifier(x)


def load_data_from_mongodb(mongo_uri: str, db_name: str, patient_collection: str, nies_collection: str):
    """Load patient and NIES data from MongoDB."""
    logger.info(f"Connecting to MongoDB: {mongo_uri}")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]

    patient_data = list(db[patient_collection].find())
    nies_data = list(db[nies_collection].find())
    client.close()

    logger.info(f"Loaded {len(patient_data)} patients and {len(nies_data)} NIES records")
    return patient_data, nies_data


def _clean_mongo_value(val):
    """Convert MongoDB extended JSON types to plain Python types."""
    if isinstance(val, dict):
        if "$oid" in val:
            return val["$oid"]
        if "$date" in val:
            return val["$date"]
        if "$numberDouble" in val:
            raw = val["$numberDouble"]
            if raw in ("NaN", "Infinity", "-Infinity"):
                return None
            return float(raw)
        if "$numberInt" in val:
            return int(val["$numberInt"])
        if "$numberLong" in val:
            return int(val["$numberLong"])
        return {k: _clean_mongo_value(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_clean_mongo_value(item) for item in val]
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


def load_data_from_json(data_file: str):
    """Load patient data from a pre-joined JSON file (MongoDB extended JSON format)."""
    logger.info(f"Loading data from JSON file: {data_file}")
    import json
    with open(data_file, "r", encoding="utf-8") as f:
        raw = json.load(f)
    patient_data = [_clean_mongo_value(record) for record in raw]
    logger.info(f"Loaded {len(patient_data)} patient-admission records from JSON")

    # Ensure icd_code is string for all diagnoses and procedures
    for record in patient_data:
        for diag in record.get('diagnoses', []):
            diag['icd_code'] = str(diag.get('icd_code', ''))
        for proc in record.get('procedures', []):
            proc['icd_code'] = str(proc.get('icd_code', ''))

    return patient_data, []


def build_pathways(patient_data: list) -> pd.DataFrame:
    """Build training pathways from patient data."""
    pathway_data = []

    for patient in patient_data:
        diagnoses = patient.get('diagnoses', [])
        procedures = patient.get('procedures', [])

        if len(diagnoses) > 0 and len(procedures) > 0:
            # Sort by sequence number
            diagnoses = sorted(diagnoses, key=lambda x: x.get('seq_num', 0))
            procedures = sorted(procedures, key=lambda x: x.get('seq_num', 0))

            # Create diagnosis sequence text
            diag_sequence = " [SEP] ".join([
                f"DIAG_{diag.get('seq_num', i)}:{str(diag.get('icd_code', ''))}:{diag.get('long_title', '')}"
                for i, diag in enumerate(diagnoses)
            ])

            proc_codes = [str(proc.get('icd_code', '')) for proc in procedures]

            # Create training examples for each procedure in sequence
            for i, target_proc in enumerate(proc_codes):
                context_procs = proc_codes[:i] if i > 0 else []
                context_text = diag_sequence

                if context_procs:
                    proc_context = " [SEP] ".join([
                        f"PROC_{j+1}:{proc}" for j, proc in enumerate(context_procs)
                    ])
                    context_text += f" [SEP] {proc_context}"

                pathway_data.append({
                    'subject_id': patient.get('subject_id'),
                    'sequence_text': context_text,
                    'target_procedure': target_proc,
                    'procedure_position': i + 1
                })

    return pd.DataFrame(pathway_data)


def prepare_data(df: pd.DataFrame, procedure_encoder: LabelEncoder, min_samples: int = 3):
    """Prepare data for training."""
    # Filter rare procedures
    proc_counts = df['target_procedure'].value_counts()
    common_procs = proc_counts[proc_counts >= min_samples].index
    df = df[df['target_procedure'].isin(common_procs)]

    # Truncate long sequences
    def truncate_sequence(text, max_parts=15):
        parts = text.split(' [SEP] ')
        if len(parts) > max_parts:
            diag_parts = [p for p in parts if p.startswith('DIAG_')]
            proc_parts = [p for p in parts if p.startswith('PROC_')]
            selected_parts = diag_parts[:10] + proc_parts[-5:]
            return ' [SEP] '.join(selected_parts)
        return text

    df['sequence_text'] = df['sequence_text'].apply(truncate_sequence)

    # Encode targets
    procedure_encoder.fit(df['target_procedure'])
    targets = procedure_encoder.transform(df['target_procedure'])

    return df['sequence_text'].tolist(), targets


def train_model(train_loader, val_loader, model, device, epochs, learning_rate):
    """Train the BERT recommender model."""
    optimizer = AdamW(model.parameters(), lr=learning_rate, weight_decay=0.01, eps=1e-8)
    total_steps = len(train_loader) * epochs
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=max(1, total_steps // 10), num_training_steps=total_steps
    )
    criterion = nn.CrossEntropyLoss()

    best_accuracy = 0.0
    patience = 5
    patience_counter = 0
    best_model_state = None

    for epoch in range(epochs):
        model.train()
        total_loss = 0

        for batch in tqdm(train_loader, desc=f"Epoch {epoch + 1}/{epochs}"):
            optimizer.zero_grad()
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            targets = batch['target'].to(device)

            outputs = model(input_ids, attention_mask)
            loss = criterion(outputs, targets)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            total_loss += loss.item()

        # Validation
        model.eval()
        val_predictions, val_targets = [], []
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                targets = batch['target'].to(device)

                outputs = model(input_ids, attention_mask)
                predictions = torch.argmax(outputs, dim=1)
                val_predictions.extend(predictions.cpu().numpy())
                val_targets.extend(targets.cpu().numpy())

        accuracy = accuracy_score(val_targets, val_predictions)
        logger.info(f"Epoch {epoch + 1}: Loss={total_loss/len(train_loader):.4f}, Val Accuracy={accuracy:.4f}")

        if accuracy > best_accuracy:
            best_accuracy = accuracy
            patience_counter = 0
            best_model_state = model.state_dict().copy()
        else:
            patience_counter += 1

        if patience_counter >= patience:
            logger.info(f"Early stopping at epoch {epoch + 1}")
            break

    if best_model_state:
        model.load_state_dict(best_model_state)
    return model, best_accuracy


def evaluate_model(model, test_loader, device, procedure_encoder, k_values=[1, 3, 5]):
    """Evaluate model with various metrics."""
    model.eval()
    all_targets = []
    all_probs = []

    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            targets = batch['target'].to(device)

            outputs = model(input_ids, attention_mask)
            probs = torch.softmax(outputs, dim=1)
            all_targets.extend(targets.cpu().numpy())
            all_probs.append(probs.cpu().numpy())

    all_probs = np.vstack(all_probs)
    all_targets = np.array(all_targets)

    metrics = {}
    for k in k_values:
        top_k_preds = np.argsort(all_probs, axis=1)[:, -k:]
        hits = [1 if t in preds else 0 for t, preds in zip(all_targets, top_k_preds)]
        metrics[f'precision@{k}'] = np.mean(hits)

    # Standard metrics
    predictions = np.argmax(all_probs, axis=1)
    metrics['accuracy'] = accuracy_score(all_targets, predictions)
    metrics['precision_macro'] = precision_score(all_targets, predictions, average='macro', zero_division=0)
    metrics['recall_macro'] = recall_score(all_targets, predictions, average='macro', zero_division=0)
    metrics['f1_macro'] = f1_score(all_targets, predictions, average='macro', zero_division=0)

    return metrics


def save_model(model, procedure_encoder, output_dir, n_procedures, procedure_descriptions=None):
    """Save model and encoder."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    checkpoint = {
        'model_state_dict': model.state_dict(),
        'n_procedures': n_procedures,
        'procedure_classes': procedure_encoder.classes_.tolist()
    }
    if procedure_descriptions:
        checkpoint['procedure_descriptions'] = procedure_descriptions
    torch.save(checkpoint, output_path / 'bert_model.pth')
    joblib.dump(procedure_encoder, output_path / 'procedure_encoder.pkl')
    logger.info(f"Model saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Train CarePlanPlus BERT model')
    parser.add_argument('--data-file', type=str, default=None,
                        help='Path to pre-joined JSON data file (bypasses MongoDB)')
    parser.add_argument('--mongo-uri', type=str, default='mongodb://localhost:27017/')
    parser.add_argument('--db-name', type=str, default='recommender_system')
    parser.add_argument('--patient-collection', type=str, default='patients')
    parser.add_argument('--nies-collection', type=str, default='nies_data')
    parser.add_argument('--output-dir', type=str, default='./models')
    parser.add_argument('--min-samples', type=int, default=2,
                        help='Minimum samples per procedure class (default: 2)')
    parser.add_argument('--epochs', type=int, default=8)
    parser.add_argument('--batch-size', type=int, default=16)
    parser.add_argument('--lr', type=float, default=3e-5)
    parser.add_argument('--freeze-layers', type=int, default=6)
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu')
    parser.add_argument('--mlflow-tracking-uri', type=str, default=None)

    args = parser.parse_args()

    if not TRANSFORMERS_AVAILABLE:
        logger.error("Transformers library not available. Please install: pip install transformers")
        return

    # Load data
    if args.data_file:
        patient_data, nies_data = load_data_from_json(args.data_file)
    else:
        patient_data, nies_data = load_data_from_mongodb(
            args.mongo_uri, args.db_name, args.patient_collection, args.nies_collection
        )

    # Build pathways
    pathway_df = build_pathways(patient_data)
    logger.info(f"Built {len(pathway_df)} pathway examples")

    # Prepare data
    procedure_encoder = LabelEncoder()
    sequences, targets = prepare_data(pathway_df, procedure_encoder, min_samples=args.min_samples)
    n_procedures = len(procedure_encoder.classes_)
    logger.info(f"Number of procedures: {n_procedures}")

    # Split data - use stratified split when possible, fall back to random
    try:
        X_train, X_temp, y_train, y_temp = train_test_split(
            sequences, targets, test_size=0.3, random_state=42, stratify=targets
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
        )
    except ValueError:
        logger.warning("Stratified split failed (small classes), using random split")
        X_train, X_temp, y_train, y_temp = train_test_split(
            sequences, targets, test_size=0.3, random_state=42
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42
        )

    # Create datasets
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    train_dataset = ProcedureDataset(X_train, y_train, tokenizer)
    val_dataset = ProcedureDataset(X_val, y_val, tokenizer)
    test_dataset = ProcedureDataset(X_test, y_test, tokenizer)

    def collate_fn(batch):
        return {
            'input_ids': torch.stack([item['input_ids'] for item in batch]),
            'attention_mask': torch.stack([item['attention_mask'] for item in batch]),
            'target': torch.stack([item['target'] for item in batch])
        }

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, collate_fn=collate_fn)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, collate_fn=collate_fn)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, collate_fn=collate_fn)

    # Initialize model
    device = torch.device(args.device)
    model = EfficientBERTRecommender(n_procedures, freeze_layers=args.freeze_layers).to(device)

    # MLflow tracking
    if MLFLOW_AVAILABLE and args.mlflow_tracking_uri:
        mlflow.set_tracking_uri(args.mlflow_tracking_uri)
        mlflow.set_experiment("careplanplus")
        mlflow.start_run(run_name=f"bert_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        mlflow.log_params({
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'learning_rate': args.lr,
            'freeze_layers': args.freeze_layers,
            'n_procedures': n_procedures
        })

    # Train
    model, best_accuracy = train_model(
        train_loader, val_loader, model, device, args.epochs, args.lr
    )

    # Evaluate
    metrics = evaluate_model(model, test_loader, device, procedure_encoder)
    logger.info("Test Metrics:")
    for name, value in metrics.items():
        logger.info(f"  {name}: {value:.4f}")

    if MLFLOW_AVAILABLE and args.mlflow_tracking_uri:
        mlflow.log_metrics(metrics)
        mlflow.end_run()

    # Build procedure description lookup from training data
    procedure_descriptions = {}
    for record in patient_data:
        for proc in record.get('procedures', []):
            code = str(proc.get('icd_code', ''))
            title = proc.get('long_title', '')
            if code and title:
                procedure_descriptions[code] = title

    # Save
    save_model(model, procedure_encoder, args.output_dir, n_procedures, procedure_descriptions)
    logger.info("Training complete!")


if __name__ == '__main__':
    main()
