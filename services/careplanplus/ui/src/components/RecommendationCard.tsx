import { Stethoscope } from 'lucide-react'
import ConfidenceBar from './ConfidenceBar'
import type { RecommendedProcedure } from '../types'

interface RecommendationCardProps {
  rec: RecommendedProcedure
}

export default function RecommendationCard({ rec }: RecommendationCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold">#{rec.rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-mono font-bold text-slate-800">{rec.procedure_code}</span>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            {rec.procedure_description || 'No description available'}
          </p>
          <ConfidenceBar confidence={rec.confidence} />
        </div>
      </div>
    </div>
  )
}
