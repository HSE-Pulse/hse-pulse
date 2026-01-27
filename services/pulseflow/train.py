#!/usr/bin/env python3
"""
PulseFlow Training Script
LSTM model for patient flow prediction
"""

import os
import argparse
import logging
from datetime import datetime
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from torch.optim import Adam
from torch.optim.lr_scheduler import ReduceLROnPlateau
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
from pymongo import MongoClient

try:
    import mlflow
    import mlflow.pytorch
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class LSTMRegressor(nn.Module):
    """LSTM model for patient flow regression."""

    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out.squeeze()


def create_sequences(data: np.ndarray, seq_length: int = 7) -> tuple:
    """Create sequences for LSTM training."""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length, 0])  # Predict first feature (ED Trolleys)
    return np.array(X), np.array(y)


def load_data_from_mongodb(mongo_uri: str, db_name: str, collection_name: str) -> pd.DataFrame:
    """Load trolley data from MongoDB."""
    logger.info(f"Connecting to MongoDB: {mongo_uri}")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    collection = db[collection_name]

    data = list(collection.find())
    df = pd.DataFrame(data)
    client.close()

    logger.info(f"Loaded {len(df)} records from MongoDB")
    return df


def load_data_from_csv(filepath: str) -> pd.DataFrame:
    """Load trolley data from CSV file."""
    logger.info(f"Loading data from {filepath}")
    return pd.read_csv(filepath)


def preprocess_data(df: pd.DataFrame, features: list) -> tuple:
    """Preprocess data for training."""
    # Ensure date column is datetime
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')

    # Select features
    available_features = [f for f in features if f in df.columns]
    if len(available_features) < len(features):
        logger.warning(f"Missing features: {set(features) - set(available_features)}")

    df_features = df[available_features].dropna()

    # Scale features
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(df_features)

    return scaled_data, scaler, available_features


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Absolute Percentage Error."""
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    input_size: int,
    hidden_size: int = 64,
    num_layers: int = 2,
    epochs: int = 100,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    device: str = 'cpu'
) -> tuple:
    """Train the LSTM model."""
    device = torch.device(device)

    # Create data loaders
    train_dataset = TensorDataset(
        torch.FloatTensor(X_train),
        torch.FloatTensor(y_train)
    )
    val_dataset = TensorDataset(
        torch.FloatTensor(X_val),
        torch.FloatTensor(y_val)
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    # Initialize model
    model = LSTMRegressor(
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=num_layers
    ).to(device)

    criterion = nn.MSELoss()
    optimizer = Adam(model.parameters(), lr=learning_rate, weight_decay=1e-5)
    scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=10)

    best_val_loss = float('inf')
    best_model_state = None
    patience_counter = 0
    early_stop_patience = 20

    history = {'train_loss': [], 'val_loss': []}

    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)

            optimizer.zero_grad()
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validation
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device)
                outputs = model(X_batch)
                loss = criterion(outputs, y_batch)
                val_loss += loss.item()

        val_loss /= len(val_loader)
        scheduler.step(val_loss)

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_model_state = model.state_dict().copy()
            patience_counter = 0
        else:
            patience_counter += 1

        if (epoch + 1) % 10 == 0:
            logger.info(f"Epoch {epoch + 1}/{epochs} - Train Loss: {train_loss:.6f}, Val Loss: {val_loss:.6f}")

        if patience_counter >= early_stop_patience:
            logger.info(f"Early stopping at epoch {epoch + 1}")
            break

    # Load best model
    model.load_state_dict(best_model_state)
    return model, history


def evaluate_model(model: nn.Module, X_test: np.ndarray, y_test: np.ndarray, device: str = 'cpu') -> dict:
    """Evaluate model on test set."""
    device = torch.device(device)
    model.eval()

    with torch.no_grad():
        X_tensor = torch.FloatTensor(X_test).to(device)
        predictions = model(X_tensor).cpu().numpy()

    metrics = {
        'mse': mean_squared_error(y_test, predictions),
        'rmse': np.sqrt(mean_squared_error(y_test, predictions)),
        'mae': mean_absolute_error(y_test, predictions),
        'mape': calculate_mape(y_test, predictions),
        'r2': r2_score(y_test, predictions)
    }

    return metrics


def save_model(model: nn.Module, scaler: StandardScaler, output_dir: str, input_size: int, hidden_size: int, num_layers: int):
    """Save model and scaler to disk."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Save model
    checkpoint = {
        'model_state_dict': model.state_dict(),
        'input_size': input_size,
        'hidden_size': hidden_size,
        'num_layers': num_layers
    }
    torch.save(checkpoint, output_path / 'lstm_model.pth')
    logger.info(f"Model saved to {output_path / 'lstm_model.pth'}")

    # Save scaler
    joblib.dump(scaler, output_path / 'scaler.pkl')
    logger.info(f"Scaler saved to {output_path / 'scaler.pkl'}")


def main():
    parser = argparse.ArgumentParser(description='Train PulseFlow LSTM model')
    parser.add_argument('--mongo-uri', type=str, default='mongodb://localhost:27017/',
                        help='MongoDB connection URI')
    parser.add_argument('--db-name', type=str, default='HSE',
                        help='Database name')
    parser.add_argument('--collection', type=str, default='trolleys',
                        help='Collection name')
    parser.add_argument('--csv-path', type=str, default=None,
                        help='Alternative: load from CSV file')
    parser.add_argument('--output-dir', type=str, default='./models',
                        help='Output directory for model artifacts')
    parser.add_argument('--seq-length', type=int, default=7,
                        help='Sequence length for LSTM')
    parser.add_argument('--hidden-size', type=int, default=64,
                        help='LSTM hidden size')
    parser.add_argument('--num-layers', type=int, default=2,
                        help='Number of LSTM layers')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu',
                        help='Device (cuda/cpu)')
    parser.add_argument('--mlflow-tracking-uri', type=str, default=None,
                        help='MLflow tracking URI')

    args = parser.parse_args()

    # Features to use
    features = [
        'ED Trolleys',
        'Ward Trolleys',
        'Surge Capacity in Use (Full report @14:00)',
        'Delayed Transfers of Care (As of Midnight)',
        'No of >75+yrs Waiting >24hrs'
    ]

    # Load data
    if args.csv_path:
        df = load_data_from_csv(args.csv_path)
    else:
        df = load_data_from_mongodb(args.mongo_uri, args.db_name, args.collection)

    # Preprocess
    scaled_data, scaler, used_features = preprocess_data(df, features)
    input_size = len(used_features)

    # Create sequences
    X, y = create_sequences(scaled_data, args.seq_length)
    logger.info(f"Created {len(X)} sequences with shape {X.shape}")

    # Split data
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.3, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)

    logger.info(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    # MLflow tracking
    if MLFLOW_AVAILABLE and args.mlflow_tracking_uri:
        mlflow.set_tracking_uri(args.mlflow_tracking_uri)
        mlflow.set_experiment("pulseflow")
        mlflow.start_run(run_name=f"lstm_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        mlflow.log_params({
            'seq_length': args.seq_length,
            'hidden_size': args.hidden_size,
            'num_layers': args.num_layers,
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'learning_rate': args.lr
        })

    # Train model
    model, history = train_model(
        X_train, y_train, X_val, y_val,
        input_size=input_size,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        device=args.device
    )

    # Evaluate
    metrics = evaluate_model(model, X_test, y_test, args.device)
    logger.info("Test Metrics:")
    for name, value in metrics.items():
        logger.info(f"  {name.upper()}: {value:.4f}")

    # Log to MLflow
    if MLFLOW_AVAILABLE and args.mlflow_tracking_uri:
        mlflow.log_metrics(metrics)
        mlflow.pytorch.log_model(model, "model")
        mlflow.end_run()

    # Save model
    save_model(model, scaler, args.output_dir, input_size, args.hidden_size, args.num_layers)

    logger.info("Training complete!")


if __name__ == '__main__':
    main()
