import { CheckCircle2 } from 'lucide-react'
import ConfidenceBar from './ConfidenceBar'
import type { PathwayStep } from '../types'

interface PathwayTimelineProps {
  steps: PathwayStep[]
}

function getStepColor(confidence: number) {
  if (confidence >= 0.7) return 'border-clinical-500 bg-clinical-50'
  if (confidence >= 0.4) return 'border-amber-500 bg-amber-50'
  return 'border-rose-500 bg-rose-50'
}

function getDotColor(confidence: number) {
  if (confidence >= 0.7) return 'bg-clinical-500'
  if (confidence >= 0.4) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function PathwayTimeline({ steps }: PathwayTimelineProps) {
  if (steps.length === 0) return null

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.step_number} className="relative flex gap-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getDotColor(step.confidence)}`}>
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            {i < steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-200 my-1" />
            )}
          </div>

          {/* Step content */}
          <div className={`flex-1 mb-4 rounded-xl border-l-4 p-4 ${getStepColor(step.confidence)}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-500">STEP {step.step_number}</span>
              <span className="text-sm font-mono font-bold text-slate-800">{step.procedure_code}</span>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              {step.procedure_description || 'No description available'}
            </p>
            <ConfidenceBar confidence={step.confidence} />
          </div>
        </div>
      ))}
    </div>
  )
}
