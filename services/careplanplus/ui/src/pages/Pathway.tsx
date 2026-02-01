import { useState, useEffect } from 'react'
import { GitBranch, Zap, Clock, TrendingUp } from 'lucide-react'
import DiagnosisInput from '../components/DiagnosisInput'
import PathwayTimeline from '../components/PathwayTimeline'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { api } from '../api/client'
import type { Diagnosis, RecommendationResponse, SampleCase } from '../types'

export default function Pathway() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [result, setResult] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [samples, setSamples] = useState<SampleCase[]>([])

  useEffect(() => {
    api.sampleDiagnoses()
      .then((s) => setSamples(s.samples))
      .catch(() => {})
  }, [])

  const handlePathway = async () => {
    if (diagnoses.length === 0) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const resp = await api.pathway({
        diagnoses,
        top_k: 5,
      })
      setResult(resp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pathway generation failed')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sample: SampleCase) => {
    setDiagnoses(sample.diagnoses)
    setResult(null)
    setError(null)
  }

  const pathway = result?.full_pathway || []
  const avgConfidence = pathway.length > 0
    ? pathway.reduce((sum, s) => sum + s.confidence, 0) / pathway.length
    : 0

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pathway Input</h3>

        {samples.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Quick Load Sample Cases</label>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.name}
                  onClick={() => loadSample(s)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <DiagnosisInput diagnoses={diagnoses} onChange={setDiagnoses} />

        <button
          onClick={handlePathway}
          disabled={diagnoses.length === 0 || loading}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-clinical-600 text-white text-sm font-medium rounded-lg hover:bg-clinical-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <GitBranch className="w-4 h-4" />
          {loading ? 'Generating...' : 'Generate Pathway'}
        </button>
      </div>

      {loading && <LoadingState message="Generating treatment pathway..." />}
      {error && <ErrorState message={error} onRetry={handlePathway} />}
      {result && pathway.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Steps</p>
                <p className="text-xl font-bold text-slate-900">{pathway.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-clinical-100 text-clinical-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Confidence</p>
                <p className="text-xl font-bold text-slate-900">{Math.round(avgConfidence * 100)}%</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Inference Time</p>
                <p className="text-xl font-bold text-slate-900">{result.inference_time_ms.toFixed(0)}ms</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Treatment Pathway</h3>
            <PathwayTimeline steps={pathway} />
          </div>
        </div>
      )}
    </div>
  )
}
