import { Link } from 'react-router-dom'
import { Users, Building2, Stethoscope, ClipboardList, Brain, GitBranch, Database } from 'lucide-react'
import StatCard from '../components/StatCard'
import SatisfactionChart from '../components/SatisfactionChart'
import HealthBadge from '../components/HealthBadge'
import ErrorState from '../components/ErrorState'
import { useHealth } from '../hooks/useHealth'
import { useDataStats } from '../hooks/useDataStats'
import { useNiesSummary } from '../hooks/useNiesData'

export default function Dashboard() {
  const { health } = useHealth()
  const stats = useDataStats()
  const nies = useNiesSummary()

  return (
    <div className="space-y-6">
      {/* Health overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Service Status</h3>
            <p className="text-sm text-slate-500">
              {health?.demo_mode ? 'Running in demo mode with synthetic predictions' : 'BERT model loaded and ready for inference'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HealthBadge health={health} />
            {health && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 border border-primary-200 text-primary-700">
                v{health.demo_mode ? 'Demo' : '1.0.0'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Patients"
            value={stats.data?.patients ?? 0}
            subtitle="Unique patients"
            icon={<Users className="w-6 h-6" />}
            color="blue"
            loading={stats.loading}
          />
          <StatCard
            title="Admissions"
            value={stats.data?.admissions ?? 0}
            subtitle="Hospital admissions"
            icon={<Building2 className="w-6 h-6" />}
            color="green"
            loading={stats.loading}
          />
          <StatCard
            title="Diagnoses"
            value={stats.data?.diagnoses ?? 0}
            subtitle="ICD diagnoses"
            icon={<ClipboardList className="w-6 h-6" />}
            color="purple"
            loading={stats.loading}
          />
          <StatCard
            title="Procedures"
            value={stats.data?.procedures ?? 0}
            subtitle="ICD procedures"
            icon={<Stethoscope className="w-6 h-6" />}
            color="amber"
            loading={stats.loading}
          />
        </div>
      )}

      {/* NIES Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">NIES Satisfaction Overview</h3>
        <p className="text-sm text-slate-500 mb-4">Average patient satisfaction by condition category</p>
        {nies.error ? (
          <ErrorState message={nies.error} onRetry={nies.refetch} />
        ) : nies.loading ? (
          <div className="h-[400px] bg-slate-50 rounded-xl animate-pulse-gentle" />
        ) : nies.data ? (
          <SatisfactionChart data={nies.data.categories} />
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/predict"
          className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-primary-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Predict Procedures</h4>
            <p className="text-xs text-slate-500">Get BERT recommendations</p>
          </div>
        </Link>

        <Link
          to="/pathway"
          className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-primary-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-clinical-100 text-clinical-600 flex items-center justify-center group-hover:bg-clinical-200 transition-colors">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Treatment Pathway</h4>
            <p className="text-xs text-slate-500">Generate full care plan</p>
          </div>
        </Link>

        <Link
          to="/data"
          className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-primary-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Data Explorer</h4>
            <p className="text-xs text-slate-500">Browse patients & records</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
