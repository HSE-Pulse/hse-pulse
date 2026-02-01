import { useState, useEffect } from 'react'
import { Brain, Zap, Clock } from 'lucide-react'
import DiagnosisInput from '../components/DiagnosisInput'
import RecommendationCard from '../components/RecommendationCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { api } from '../api/client'
import type { Diagnosis, RecommendationResponse, SampleCase } from '../types'

export default function Predict() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<string>('')
  const [procHistory, setProcHistory] = useState<string>('')
  const [topK, setTopK] = useState(5)
  const [result, setResult] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [samples, setSamples] = useState<SampleCase[]>([])

  useEffect(() => {
    api.sampleDiagnoses()
      .then((s) => setSamples(s.samples))
      .catch(() => {})
  }, [])

  const handlePredict = async () => {
    if (diagnoses.length === 0) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const history = procHistory.trim()
        ? procHistory.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined
      const resp = await api.predict({
        diagnoses,
        procedure_history: history,
        patient_age: age ? parseInt(age) : undefined,
        patient_gender: gender || undefined,
        top_k: topK,
      })
      setResult(resp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sample: SampleCase) => {
    setDiagnoses(sample.diagnoses)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Prediction Input</h3>

        {/* Sample cases */}
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

        {/* Patient context */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="0-120"
              min={0}
              max={120}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Procedure History</label>
            <input
              type="text"
              value={procHistory}
              onChange={(e) => setProcHistory(e.target.value)}
              placeholder="e.g. 0BH17ZZ, 5A1955Z"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Top-K slider */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Top-K Recommendations: <span className="font-bold text-primary-600">{topK}</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value))}
            className="w-full accent-primary-600"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handlePredict}
          disabled={diagnoses.length === 0 || loading}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Zap className="w-4 h-4" />
          {loading ? 'Predicting...' : 'Get Recommendations'}
        </button>
      </div>

      {/* Results */}
      {loading && <LoadingState message="Running BERT inference..." />}
      {error && <ErrorState message={error} onRetry={handlePredict} />}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="text-lg font-semibold text-slate-900">Recommendations</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Brain className="w-3.5 h-3.5" />
              <span>Model v{result.model_version}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{result.inference_time_ms.toFixed(1)}ms</span>
            </div>
          </div>
          <div className="grid gap-3">
            {result.recommendations.map((rec) => (
              <RecommendationCard key={rec.rank} rec={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
