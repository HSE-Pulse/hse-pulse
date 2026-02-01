import { BarChart3, Users, TrendingUp } from 'lucide-react'
import SatisfactionChart from '../components/SatisfactionChart'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useNiesSummary } from '../hooks/useNiesData'

const AGE_GROUP_LABELS: Record<number, string> = {
  1: '18-34',
  2: '35-49',
  3: '50-64',
  4: '65-79',
  5: '80+',
}

const GENDER_LABELS: Record<number, string> = {
  1: 'Male',
  2: 'Female',
}

export default function NiesAnalytics() {
  const { data, loading, error, refetch } = useNiesSummary()

  if (loading) return <LoadingState message="Loading NIES analytics..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const categories = data.categories

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Records</p>
              <p className="text-2xl font-bold text-slate-900">{data.total_records.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-clinical-100 text-clinical-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Condition Categories</p>
              <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Highest Satisfaction</p>
              <p className="text-2xl font-bold text-slate-900">
                {categories.length > 0 ? `${Math.round(categories[0].avg_satisfaction * 100)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Satisfaction by Condition Category</h3>
        <p className="text-sm text-slate-500 mb-4">Average patient satisfaction scores across all NIES condition categories</p>
        <SatisfactionChart data={categories} height={450} />
      </div>

      {/* Category cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Condition Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const pct = Math.round(cat.avg_satisfaction * 100)
            const barColor = pct >= 70 ? 'bg-clinical-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
            return (
              <div key={cat.condition_label} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <h4 className="text-sm font-semibold text-slate-800 mb-1">{cat.condition_label}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span className="font-mono">{cat.icd10_from}-{cat.icd10_to}</span>
                  <span>|</span>
                  <span>{cat.count} records</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{pct}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Min: {Math.round(cat.min_satisfaction * 100)}%</span>
                  <span>Max: {Math.round(cat.max_satisfaction * 100)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
