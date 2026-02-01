import { useState, useEffect } from 'react'
import { Activity, Server, ExternalLink, Play } from 'lucide-react'
import HealthBadge from '../components/HealthBadge'
import LoadingState from '../components/LoadingState'
import { useHealth } from '../hooks/useHealth'
import { api } from '../api/client'
import type { ServiceConfig } from '../types'

export default function Settings() {
  const { health } = useHealth(5000)
  const [config, setConfig] = useState<ServiceConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [trainEpochs, setTrainEpochs] = useState(10)
  const [trainBatch, setTrainBatch] = useState(16)
  const [trainLr, setTrainLr] = useState('2e-5')
  const [trainStatus, setTrainStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setConfigLoading(false))
  }, [])

  const handleSaveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      const result = await api.updateConfig(config)
      setConfig(result.config)
    } catch {
      // keep current
    } finally {
      setSaving(false)
    }
  }

  const handleTrain = async () => {
    setTrainStatus(null)
    try {
      const result = await api.train({
        epochs: trainEpochs,
        batch_size: trainBatch,
        learning_rate: trainLr,
      })
      setTrainStatus(`Training started: ${result.job_id}`)
    } catch (e) {
      setTrainStatus(`Error: ${e instanceof Error ? e.message : 'Failed'}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">Service Health</h3>
        </div>
        {health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <HealthBadge health={health} />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Model Loaded</p>
              <p className="text-sm font-semibold">{health.model_loaded ? 'Yes' : 'No'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Database</p>
              <p className="text-sm font-semibold">{health.database_connected ? 'Connected' : 'Disconnected'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Mode</p>
              <p className="text-sm font-semibold">{health.demo_mode ? 'Demo' : 'Production'}</p>
            </div>
          </div>
        ) : (
          <LoadingState message="Checking health..." />
        )}
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">Service Configuration</h3>
        </div>
        {configLoading ? (
          <LoadingState message="Loading config..." />
        ) : config ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model Path</label>
                <input
                  type="text"
                  value={config.model_path}
                  onChange={(e) => setConfig({ ...config, model_path: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tokenizer</label>
                <input
                  type="text"
                  value={config.tokenizer}
                  onChange={(e) => setConfig({ ...config, tokenizer: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Top-K Default</label>
                <input
                  type="number"
                  value={config.top_k}
                  onChange={(e) => setConfig({ ...config, top_k: parseInt(e.target.value) })}
                  min={1}
                  max={10}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confidence Threshold</label>
                <input
                  type="number"
                  value={config.confidence_threshold}
                  onChange={(e) => setConfig({ ...config, confidence_threshold: parseFloat(e.target.value) })}
                  step={0.1}
                  min={0}
                  max={1}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Unable to load configuration</p>
        )}
      </div>

      {/* Training */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-5 h-5 text-clinical-600" />
          <h3 className="text-lg font-semibold text-slate-900">Model Training</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Epochs</label>
            <input
              type="number"
              value={trainEpochs}
              onChange={(e) => setTrainEpochs(parseInt(e.target.value))}
              min={1}
              max={50}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Batch Size</label>
            <input
              type="number"
              value={trainBatch}
              onChange={(e) => setTrainBatch(parseInt(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Learning Rate</label>
            <input
              type="text"
              value={trainLr}
              onChange={(e) => setTrainLr(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <button
          onClick={handleTrain}
          className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-medium rounded-lg hover:bg-clinical-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          Start Training
        </button>
        {trainStatus && (
          <p className={`text-sm mt-3 ${trainStatus.startsWith('Error') ? 'text-rose-600' : 'text-clinical-600'}`}>
            {trainStatus}
          </p>
        )}
      </div>

      {/* API Docs link */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <a
          href={`${window.__CAREPLANPLUS_CONFIG__?.API_BASE || '/careplanplus/api'}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-primary-600 hover:text-primary-700 font-medium"
        >
          <ExternalLink className="w-5 h-5" />
          Open FastAPI Swagger Documentation
        </a>
      </div>
    </div>
  )
}
