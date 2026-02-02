// Health & System
export interface HealthResponse {
  status: string
  model_loaded: boolean
  database_connected: boolean
  timestamp: string
}

// Hospital
export interface Hospital {
  hospital_code: string
  trolley_code: string
  name: string
  region: string
  hse_area: string
}

// Prediction
export interface PredictionRequest {
  region: string
  hospital: string
  date: string
  forecast_days: number
  surge_capacity?: number
  delayed_transfers?: number
  waiting_24hrs?: number
  waiting_75y_24hrs?: number
}

export interface ForecastDay {
  date: string
  day: string
  predicted_trolleys: number
  confidence_lower: number
  confidence_upper: number
}

export interface PredictionResponse {
  model: string
  hospital: string
  region: string
  forecast_start: string
  forecast: ForecastDay[]
  model_version: string
  inference_time_ms: number
}

// Trolley Data
export interface TrolleyRecord {
  date: string
  hospital_code: string
  trolley_count: number
  admissions?: number
  discharges?: number
  trolleys_gt_24hrs?: number
  elderly_waiting?: number
}

export interface TrolleyDataResponse {
  hospital_code: string
  records: TrolleyRecord[]
  message?: string
}

// Training
export interface TrainingConfig {
  epochs: number
  batch_size: number
  learning_rate: number
  hidden_size: number
  device: string
}

export interface TrainingResponse {
  status: string
  job_id: string
  mlflow_run_id?: string
  mlflow_experiment?: string
  config: TrainingConfig
  message: string
}

export interface TrainingStatus {
  job_id: string
  status: string
  progress: number
  metrics: {
    mae?: number
    rmse?: number
    epochs_completed?: number
  }
}

// Data Info
export interface LatestDateResponse {
  latest_date: string | null
}

// Service Config
export interface ServiceConfig {
  model_path: string
  scaler_path: string
  forecast_window: number
  confidence_interval: number
  max_batch_size: number
  cache_ttl: number
}
