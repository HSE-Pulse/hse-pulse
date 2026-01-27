"""
PulseNotes Model Training Script with MLflow Integration
Bio_ClinicalBERT fine-tuning for clinical NER and text classification
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Any, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score

try:
    import mlflow
    import mlflow.pytorch
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("MLflow not available. Install with: pip install mlflow")

try:
    from transformers import AutoTokenizer, AutoModel, AutoModelForTokenClassification
    from transformers import get_linear_schedule_with_warmup
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Transformers not available. Install with: pip install transformers")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# NER Labels for clinical entity recognition
NER_LABELS = [
    'O',           # Outside
    'B-PROBLEM',   # Beginning of medical problem
    'I-PROBLEM',   # Inside medical problem
    'B-TREATMENT', # Beginning of treatment
    'I-TREATMENT', # Inside treatment
    'B-TEST',      # Beginning of test/procedure
    'I-TEST',      # Inside test/procedure
    'B-DRUG',      # Beginning of medication
    'I-DRUG',      # Inside medication
]

LABEL2ID = {label: i for i, label in enumerate(NER_LABELS)}
ID2LABEL = {i: label for i, label in enumerate(NER_LABELS)}


class ClinicalNERDataset(Dataset):
    """Dataset for clinical NER training."""

    def __init__(self, texts: List[str], labels: List[List[str]], tokenizer, max_length: int = 256):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        word_labels = self.labels[idx]

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt',
            return_offsets_mapping=True
        )

        # Align labels with wordpiece tokens
        aligned_labels = self._align_labels(
            encoding['offset_mapping'].squeeze(),
            word_labels,
            text
        )

        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(aligned_labels, dtype=torch.long)
        }

    def _align_labels(self, offset_mapping, word_labels, text):
        """Align word-level labels to wordpiece tokens."""
        aligned = []
        words = text.split()
        word_idx = 0
        char_idx = 0

        for offset in offset_mapping:
            start, end = offset.tolist()

            if start == 0 and end == 0:
                # Special token
                aligned.append(-100)
            else:
                # Find which word this token belongs to
                while word_idx < len(words) and char_idx + len(words[word_idx]) < start:
                    char_idx += len(words[word_idx]) + 1
                    word_idx += 1

                if word_idx < len(word_labels):
                    aligned.append(LABEL2ID.get(word_labels[word_idx], 0))
                else:
                    aligned.append(0)  # 'O' label

        # Pad to max_length
        while len(aligned) < self.max_length:
            aligned.append(-100)

        return aligned[:self.max_length]


class ClinicalNERModel(nn.Module):
    """Clinical NER model based on Bio_ClinicalBERT."""

    def __init__(self, model_name: str = "emilyalsentzer/Bio_ClinicalBERT", num_labels: int = 9):
        super().__init__()

        self.bert = AutoModel.from_pretrained(model_name)
        hidden_size = self.bert.config.hidden_size

        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(hidden_size, num_labels)

        nn.init.xavier_uniform_(self.classifier.weight)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = outputs.last_hidden_state
        sequence_output = self.dropout(sequence_output)
        logits = self.classifier(sequence_output)
        return logits


def generate_synthetic_ner_data(n_samples: int = 500) -> Tuple[List[str], List[List[str]]]:
    """Generate synthetic clinical NER training data."""

    # Templates with entity annotations
    templates = [
        {
            'text': 'Patient presents with {PROBLEM} and was prescribed {DRUG}.',
            'problems': ['chest pain', 'shortness of breath', 'abdominal pain', 'headache', 'fever'],
            'drugs': ['metformin', 'lisinopril', 'aspirin', 'atorvastatin', 'metoprolol']
        },
        {
            'text': 'History of {PROBLEM}, currently on {DRUG} for management.',
            'problems': ['hypertension', 'diabetes mellitus', 'COPD', 'heart failure', 'atrial fibrillation'],
            'drugs': ['amlodipine', 'insulin', 'albuterol', 'furosemide', 'warfarin']
        },
        {
            'text': 'Underwent {TEST} which showed {PROBLEM}.',
            'tests': ['ECG', 'CT scan', 'chest X-ray', 'MRI', 'echocardiogram'],
            'problems': ['ST elevation', 'pulmonary infiltrates', 'cardiomegaly', 'pleural effusion', 'mass lesion']
        },
        {
            'text': 'Started on {TREATMENT} for {PROBLEM}.',
            'treatments': ['IV fluids', 'oxygen therapy', 'mechanical ventilation', 'dialysis', 'chemotherapy'],
            'problems': ['dehydration', 'hypoxia', 'respiratory failure', 'renal failure', 'malignancy']
        },
        {
            'text': 'Labs showed {PROBLEM}. Plan: {TEST} and {DRUG}.',
            'problems': ['elevated troponin', 'leukocytosis', 'anemia', 'hyperkalemia', 'elevated creatinine'],
            'tests': ['repeat labs', 'cardiac catheterization', 'colonoscopy', 'biopsy', 'ultrasound'],
            'drugs': ['heparin', 'antibiotics', 'iron supplements', 'kayexalate', 'IV hydration']
        }
    ]

    texts = []
    labels_list = []

    for _ in range(n_samples):
        template = np.random.choice(templates)
        text = template['text']
        word_labels = []

        # Replace placeholders and generate labels
        if '{PROBLEM}' in text:
            problem = np.random.choice(template.get('problems', ['condition']))
            text = text.replace('{PROBLEM}', problem, 1)

        if '{DRUG}' in text:
            drug = np.random.choice(template.get('drugs', ['medication']))
            text = text.replace('{DRUG}', drug, 1)

        if '{TEST}' in text:
            test = np.random.choice(template.get('tests', ['procedure']))
            text = text.replace('{TEST}', test, 1)

        if '{TREATMENT}' in text:
            treatment = np.random.choice(template.get('treatments', ['therapy']))
            text = text.replace('{TREATMENT}', treatment, 1)

        # Generate word-level labels (simplified)
        words = text.split()
        for i, word in enumerate(words):
            # Check if word is part of entity (simplified heuristic)
            word_lower = word.lower().strip('.,')

            if any(prob in word_lower for prob in ['pain', 'fever', 'hypertension', 'diabetes', 'failure', 'elevation']):
                word_labels.append('B-PROBLEM' if i == 0 or word_labels[-1] == 'O' else 'I-PROBLEM')
            elif any(drug in word_lower for drug in ['metformin', 'lisinopril', 'aspirin', 'insulin', 'heparin']):
                word_labels.append('B-DRUG' if i == 0 or word_labels[-1] == 'O' else 'I-DRUG')
            elif any(test in word_lower for test in ['ecg', 'scan', 'x-ray', 'mri', 'labs']):
                word_labels.append('B-TEST' if i == 0 or word_labels[-1] == 'O' else 'I-TEST')
            elif any(treat in word_lower for treat in ['fluids', 'therapy', 'ventilation', 'dialysis']):
                word_labels.append('B-TREATMENT' if i == 0 or word_labels[-1] == 'O' else 'I-TREATMENT')
            else:
                word_labels.append('O')

        texts.append(text)
        labels_list.append(word_labels)

    return texts, labels_list


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    epochs: int = 5,
    learning_rate: float = 2e-5,
    log_to_mlflow: bool = True
) -> Dict[str, Any]:
    """Train the NER model with MLflow logging."""

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    total_steps = len(train_loader) * epochs
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(0.1 * total_steps),
        num_training_steps=total_steps
    )

    criterion = nn.CrossEntropyLoss(ignore_index=-100)

    best_val_f1 = 0.0
    history = {'train_loss': [], 'val_loss': [], 'val_f1': []}

    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0

        for batch in train_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            optimizer.zero_grad()
            logits = model(input_ids, attention_mask)

            # Flatten for loss computation
            loss = criterion(logits.view(-1, len(NER_LABELS)), labels.view(-1))
            loss.backward()
            optimizer.step()
            scheduler.step()

            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        all_preds, all_labels = [], []

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                labels = batch['labels'].to(device)

                logits = model(input_ids, attention_mask)
                loss = criterion(logits.view(-1, len(NER_LABELS)), labels.view(-1))
                val_loss += loss.item()

                preds = logits.argmax(dim=-1)

                # Filter out padding tokens
                for pred_seq, label_seq, mask in zip(preds, labels, attention_mask):
                    for p, l, m in zip(pred_seq, label_seq, mask):
                        if m == 1 and l != -100:
                            all_preds.append(p.item())
                            all_labels.append(l.item())

        val_loss /= len(val_loader)
        val_f1 = f1_score(all_labels, all_preds, average='weighted', zero_division=0)

        # Log metrics
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['val_f1'].append(val_f1)

        if MLFLOW_AVAILABLE and log_to_mlflow:
            mlflow.log_metrics({
                'train_loss': train_loss,
                'val_loss': val_loss,
                'val_f1': val_f1
            }, step=epoch)

        logger.info(f"Epoch {epoch+1}/{epochs} - Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}, Val F1: {val_f1:.4f}")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1

    # Final metrics
    precision = precision_score(all_labels, all_preds, average='weighted', zero_division=0)
    recall = recall_score(all_labels, all_preds, average='weighted', zero_division=0)

    final_metrics = {
        'best_val_f1': best_val_f1,
        'final_val_f1': val_f1,
        'precision': precision,
        'recall': recall
    }

    if MLFLOW_AVAILABLE and log_to_mlflow:
        mlflow.log_metrics(final_metrics)

    return {**final_metrics, 'history': history}


def main():
    parser = argparse.ArgumentParser(description='Train PulseNotes NER model')
    parser.add_argument('--epochs', type=int, default=5, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size')
    parser.add_argument('--learning-rate', type=float, default=2e-5, help='Learning rate')
    parser.add_argument('--n-samples', type=int, default=500, help='Number of synthetic samples')
    parser.add_argument('--output-dir', type=str, default='../models/pulsenotes', help='Output directory')
    parser.add_argument('--mlflow-uri', type=str, default='http://localhost:5000', help='MLflow tracking URI')
    parser.add_argument('--experiment-name', type=str, default='PulseNotes-NER', help='MLflow experiment name')
    args = parser.parse_args()

    # Setup device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")

    # Check transformers
    if not TRANSFORMERS_AVAILABLE:
        logger.error("Transformers library required for training")
        sys.exit(1)

    # Setup MLflow
    if MLFLOW_AVAILABLE:
        mlflow.set_tracking_uri(args.mlflow_uri)
        mlflow.set_experiment(args.experiment_name)
        logger.info(f"MLflow tracking URI: {args.mlflow_uri}")

    # Generate synthetic data
    logger.info(f"Generating {args.n_samples} synthetic NER samples...")
    texts, labels = generate_synthetic_ner_data(args.n_samples)

    # Split data
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    # Initialize tokenizer
    tokenizer = AutoTokenizer.from_pretrained("emilyalsentzer/Bio_ClinicalBERT")

    # Create datasets
    train_dataset = ClinicalNERDataset(train_texts, train_labels, tokenizer)
    val_dataset = ClinicalNERDataset(val_texts, val_labels, tokenizer)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)

    # Initialize model
    model = ClinicalNERModel(num_labels=len(NER_LABELS)).to(device)

    # Start MLflow run
    run_name = f"pulsenotes-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    with mlflow.start_run(run_name=run_name) if MLFLOW_AVAILABLE else nullcontext():
        # Log parameters
        if MLFLOW_AVAILABLE:
            mlflow.log_params({
                'epochs': args.epochs,
                'batch_size': args.batch_size,
                'learning_rate': args.learning_rate,
                'n_samples': args.n_samples,
                'num_labels': len(NER_LABELS),
                'model_type': 'Bio_ClinicalBERT-NER',
                'base_model': 'emilyalsentzer/Bio_ClinicalBERT'
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
        model_path = os.path.join(args.output_dir, 'ner_model.pth')

        checkpoint = {
            'model_state_dict': model.state_dict(),
            'num_labels': len(NER_LABELS),
            'label2id': LABEL2ID,
            'id2label': ID2LABEL
        }
        torch.save(checkpoint, model_path)
        logger.info(f"Model saved to {model_path}")

        # Save label mapping
        label_mapping_path = os.path.join(args.output_dir, 'label_mapping.json')
        with open(label_mapping_path, 'w') as f:
            json.dump({'label2id': LABEL2ID, 'id2label': ID2LABEL}, f, indent=2)

        # Log to MLflow
        if MLFLOW_AVAILABLE:
            mlflow.pytorch.log_model(model, "model")
            mlflow.log_artifact(model_path)
            mlflow.log_artifact(label_mapping_path)

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
