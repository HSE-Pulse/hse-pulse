import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import { api } from '../api/client'
import type { ServiceConfig } from '../types'

export default function Settings() {
  const [config, setConfig] = useState<ServiceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const cfg = await api.getConfig()
      setConfig(cfg as ServiceConfig)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await api.updateConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Service Configuration</h3>
          </div>
          <button
            onClick={loadConfig}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>

        {config && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Model Path</label>
              <input
                type="text"
                value={config.model_path}
                onChange={(e) => setConfig({ ...config, model_path: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Scaler Path</label>
              <input
                type="text"
                value={config.scaler_path}
                onChange={(e) => setConfig({ ...config, scaler_path: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Forecast Window (days)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={config.forecast_window}
                onChange={(e) => setConfig({ ...config, forecast_window: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Confidence Interval (%)</label>
              <input
                type="number"
                min={50}
                max={99}
                value={config.confidence_interval}
                onChange={(e) => setConfig({ ...config, confidence_interval: parseInt(e.target.value) || 95 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Max Batch Size</label>
              <input
                type="number"
                min={1}
                max={256}
                value={config.max_batch_size}
                onChange={(e) => setConfig({ ...config, max_batch_size: parseInt(e.target.value) || 32 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Cache TTL (seconds)</label>
              <input
                type="number"
                min={0}
                max={3600}
                value={config.cache_ttl}
                onChange={(e) => setConfig({ ...config, cache_ttl: parseInt(e.target.value) || 300 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleSave}
            disabled={saving || !config}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>

          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-clinical-600">
              <CheckCircle className="w-4 h-4" />
              Configuration saved
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
