"""
PulseFlow Model Training Script with MLflow Integration
LSTM-based patient flow prediction for HSE trolley wait forecasting
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    import mlflow
    import mlflow.pytorch
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("MLflow not available. Install with: pip install mlflow")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TimeSeriesDataset(Dataset):
    """Dataset for time series prediction."""

    def __init__(self, sequences: np.ndarray, targets: np.ndarray):
        self.sequences = torch.FloatTensor(sequences)
        self.targets = torch.FloatTensor(targets)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]


class LSTMPredictor(nn.Module):
    """LSTM model for patient flow prediction."""

    def __init__(
        self,
        input_size: int = 5,
        hidden_size: int = 128,
        num_layers: int = 2,
        output_size: int = 1,
        dropout: float = 0.2
    ):
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

        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, output_size)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch, seq_len, input_size)
        lstm_out, _ = self.lstm(x)
        # Take the last output
        last_output = lstm_out[:, -1, :]
        return self.fc(last_output)


def generate_synthetic_hse_data(
    n_days: int = 365,
    hospitals: List[str] = None
) -> pd.DataFrame:
    """Generate synthetic HSE trolley data for demonstration."""

    if hospitals is None:
        hospitals = ['UH Kerry', 'CUH', 'UHW', 'UHG', 'UHL']

    data = []
    base_date = datetime.now() - timedelta(days=n_days)

    for hospital in hospitals:
        # Hospital-specific base values
        base_trolleys = {
            'UH Kerry': 25,
            'CUH': 45,
            'UHW': 30,
            'UHG': 40,
            'UHL': 35
        }.get(hospital, 30)

        for day in range(n_days):
            current_date = base_date + timedelta(days=day)
            day_of_week = current_date.weekday()

            # Weekly pattern (higher on weekdays)
            weekly_factor = 1.2 if day_of_week < 5 else 0.8

            # Seasonal pattern (higher in winter)
            month = current_date.month
            seasonal_factor = 1.3 if month in [11, 12, 1, 2] else (0.9 if month in [6, 7, 8] else 1.0)

            # Generate features
            trolleys = int(base_trolleys * weekly_factor * seasonal_factor + np.random.normal(0, 5))
            trolleys = max(0, trolleys)

            admissions = int(trolleys * 0.6 + np.random.normal(10, 3))
            discharges = int(admissions * 0.85 + np.random.normal(0, 2))
            wait_gt_24h = int(trolleys * 0.3 + np.random.normal(0, 2))
            elderly_waiting = int(wait_gt_24h * 0.4 + np.random.normal(0, 1))

            data.append({
                'date': current_date,
                'hospital': hospital,
                'day_of_week': day_of_week,
                'month': month,
                'trolleys': max(0, trolleys),
                'admissions': max(0, admissions),
                'discharges': max(0, discharges),
                'wait_gt_24h': max(0, wait_gt_24h),
                'elderly_waiting': max(0, elderly_waiting)
            })

    return pd.DataFrame(data)


def create_sequences(
    data: np.ndarray,
    seq_length: int = 14,
    forecast_horizon: int = 7
) -> Tuple[np.ndarray, np.ndarray]:
    """Create sequences for time series prediction."""

    sequences = []
    targets = []

    for i in range(len(data) - seq_length - forecast_horizon + 1):
        seq = data[i:i + seq_length]
        # Predict trolleys for next forecast_horizon days
        target = data[i + seq_length:i + seq_length + forecast_horizon, 0]  # First column is trolleys
        sequences.append(seq)
        targets.append(target)

    return np.array(sequences), np.array(targets)


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    epochs: int = 50,
    learning_rate: float = 0.001,
    log_to_mlflow: bool = True
) -> Dict[str, Any]:
    """Train the LSTM model with MLflow logging."""

    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.MSELoss()
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    best_val_loss = float('inf')
    history = {'train_loss': [], 'val_loss': [], 'val_mae': []}

    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0

        for sequences, targets in train_loader:
            sequences = sequences.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(sequences)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        all_preds, all_targets = [], []

        with torch.no_grad():
            for sequences, targets in val_loader:
                sequences = sequences.to(device)
                targets = targets.to(device)

                outputs = model(sequences)
                loss = criterion(outputs, targets)

                val_loss += loss.item()
                all_preds.extend(outputs.cpu().numpy())
                all_targets.extend(targets.cpu().numpy())

        val_loss /= len(val_loader)
        val_mae = mean_absolute_error(all_targets, all_preds)

        # Log metrics
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['val_mae'].append(val_mae)

        if MLFLOW_AVAILABLE and log_to_mlflow:
            mlflow.log_metrics({
                'train_loss': train_loss,
                'val_loss': val_loss,
                'val_mae': val_mae
            }, step=epoch)

        logger.info(f"Epoch {epoch+1}/{epochs} - Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}, Val MAE: {val_mae:.2f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss

        scheduler.step(val_loss)

    # Compute final metrics
    val_rmse = np.sqrt(mean_squared_error(all_targets, all_preds))
    val_r2 = r2_score(np.array(all_targets).flatten(), np.array(all_preds).flatten())

    final_metrics = {
        'best_val_loss': best_val_loss,
        'final_val_loss': val_loss,
        'val_mae': val_mae,
        'val_rmse': val_rmse,
        'val_r2': val_r2
    }

    if MLFLOW_AVAILABLE and log_to_mlflow:
        mlflow.log_metrics(final_metrics)

    return {**final_metrics, 'history': history}


def main():
    parser = argparse.ArgumentParser(description='Train PulseFlow LSTM model')
    parser.add_argument('--epochs', type=int, default=30, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--learning-rate', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--n-days', type=int, default=365, help='Number of days of synthetic data')
    parser.add_argument('--seq-length', type=int, default=14, help='Sequence length for LSTM')
    parser.add_argument('--forecast-horizon', type=int, default=7, help='Forecast horizon in days')
    parser.add_argument('--output-dir', type=str, default='../models/pulseflow', help='Output directory')
    parser.add_argument('--mlflow-uri', type=str, default='http://localhost:5000', help='MLflow tracking URI')
    parser.add_argument('--experiment-name', type=str, default='PulseFlow-LSTM', help='MLflow experiment name')
    args = parser.parse_args()

    # Setup device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")

    # Setup MLflow
    if MLFLOW_AVAILABLE:
        mlflow.set_tracking_uri(args.mlflow_uri)
        mlflow.set_experiment(args.experiment_name)
        logger.info(f"MLflow tracking URI: {args.mlflow_uri}")

    # Generate synthetic data
    logger.info(f"Generating {args.n_days} days of synthetic HSE data...")
    df = generate_synthetic_hse_data(args.n_days)

    # Process data for one hospital (UH Kerry)
    hospital_df = df[df['hospital'] == 'UH Kerry'].sort_values('date')

    # Select features
    features = ['trolleys', 'admissions', 'discharges', 'wait_gt_24h', 'day_of_week']
    data = hospital_df[features].values

    # Scale data
    scaler = MinMaxScaler()
    data_scaled = scaler.fit_transform(data)

    # Create sequences
    sequences, targets = create_sequences(
        data_scaled,
        seq_length=args.seq_length,
        forecast_horizon=args.forecast_horizon
    )

    logger.info(f"Created {len(sequences)} sequences")

    # Split data
    split_idx = int(len(sequences) * 0.8)
    train_sequences, val_sequences = sequences[:split_idx], sequences[split_idx:]
    train_targets, val_targets = targets[:split_idx], targets[split_idx:]

    # Create datasets
    train_dataset = TimeSeriesDataset(train_sequences, train_targets)
    val_dataset = TimeSeriesDataset(val_sequences, val_targets)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)

    # Initialize model
    model = LSTMPredictor(
        input_size=len(features),
        hidden_size=128,
        num_layers=2,
        output_size=args.forecast_horizon
    ).to(device)

    # Start MLflow run
    run_name = f"pulseflow-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    with mlflow.start_run(run_name=run_name) if MLFLOW_AVAILABLE else nullcontext():
        # Log parameters
        if MLFLOW_AVAILABLE:
            mlflow.log_params({
                'epochs': args.epochs,
                'batch_size': args.batch_size,
                'learning_rate': args.learning_rate,
                'n_days': args.n_days,
                'seq_length': args.seq_length,
                'forecast_horizon': args.forecast_horizon,
                'model_type': 'LSTM',
                'hidden_size': 128,
                'num_layers': 2
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
        model_path = os.path.join(args.output_dir, 'lstm_model.pth')

        checkpoint = {
            'model_state_dict': model.state_dict(),
            'scaler_min': scaler.min_.tolist(),
            'scaler_scale': scaler.scale_.tolist(),
            'features': features,
            'seq_length': args.seq_length,
            'forecast_horizon': args.forecast_horizon
        }
        torch.save(checkpoint, model_path)
        logger.info(f"Model saved to {model_path}")

        # Log model to MLflow
        if MLFLOW_AVAILABLE:
            mlflow.pytorch.log_model(model, "model")
            mlflow.log_artifact(model_path)

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
