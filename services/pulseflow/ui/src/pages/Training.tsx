import { useState, useEffect, useRef } from 'react'
import {
  GraduationCap,
  Play,
  Loader2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import { api } from '../api/client'
import type { TrainingStatus } from '../types'

export default function Training() {
  const [epochs, setEpochs] = useState(100)
  const [batchSize, setBatchSize] = useState(64)
  const [learningRate, setLearningRate] = useState(0.001)
  const [hiddenSize, setHiddenSize] = useState(64)
  const [device, setDevice] = useState('cpu')

  const [jobId, setJobId] = useState<string | null>(null)
  const [mlflowRunId, setMlflowRunId] = useState<string | null>(null)
  const [status, setStatus] = useState<TrainingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleStartTraining = async () => {
    setLoading(true)
    setError(null)
    setStatus(null)
    setJobId(null)
    try {
      const res = await api.train({
        epochs,
        batch_size: batchSize,
        learning_rate: learningRate,
        hidden_size: hiddenSize,
        device,
      })
      setJobId(res.job_id)
      setMlflowRunId(res.mlflow_run_id ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start training')
    } finally {
      setLoading(false)
    }
  }

  // Poll for training status
  useEffect(() => {
    if (!jobId) return

    const poll = () => {
      api.trainingStatus(jobId)
        .then(setStatus)
        .catch(() => {})
    }

    poll()
    pollRef.current = setInterval(poll, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobId])

  // Stop polling when complete
  useEffect(() => {
    if (status?.status === 'completed' || status?.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [status])

  const isComplete = status?.status === 'completed'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Config Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">Training Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Epochs (1-500)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={epochs}
              onChange={(e) => setEpochs(parseInt(e.target.value) || 100)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Batch Size</label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              {[16, 32, 64, 128, 256].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Learning Rate</label>
            <select
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              {[0.0001, 0.0005, 0.001, 0.005, 0.01].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Hidden Size</label>
            <select
              value={hiddenSize}
              onChange={(e) => setHiddenSize(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              {[32, 64, 128, 256].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Device</label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="cpu">CPU</option>
              <option value="cuda">CUDA (GPU)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-5">
          <button
            onClick={handleStartTraining}
            disabled={loading || (!!jobId && !isComplete)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? 'Submitting...' : 'Start Training'}
          </button>

          {mlflowRunId && (
            <a
              href={`/mlflow/#/experiments/0/runs/${mlflowRunId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View in MLflow <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Training Status */}
      {jobId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Training Progress</h3>
            <span className="text-xs text-slate-500 font-mono">{jobId}</span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">
                {status ? `${status.status}` : 'Starting...'}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {status?.progress ?? 0}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-clinical-500' : 'bg-primary-500'
                }`}
                style={{ width: `${status?.progress ?? 0}%` }}
              />
            </div>
          </div>

          {/* Metrics */}
          {status?.metrics && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">Epochs</div>
                <div className="text-sm font-bold text-slate-900">
                  {status.metrics.epochs_completed ?? '-'} / {epochs}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">MAE</div>
                <div className="text-sm font-bold text-slate-900">
                  {status.metrics.mae?.toFixed(2) ?? '-'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">RMSE</div>
                <div className="text-sm font-bold text-slate-900">
                  {status.metrics.rmse?.toFixed(2) ?? '-'}
                </div>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-clinical-50 border border-clinical-100 text-sm text-clinical-700">
              <CheckCircle className="w-4 h-4" />
              Training completed successfully
            </div>
          )}
        </div>
      )}
    </div>
  )
}
