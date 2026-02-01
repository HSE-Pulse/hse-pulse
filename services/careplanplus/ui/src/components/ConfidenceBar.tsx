interface ConfidenceBarProps {
  confidence: number
  showLabel?: boolean
}

function getColor(confidence: number) {
  if (confidence >= 0.7) return 'bg-clinical-500'
  if (confidence >= 0.4) return 'bg-amber-500'
  return 'bg-rose-500'
}

function getTextColor(confidence: number) {
  if (confidence >= 0.7) return 'text-clinical-700'
  if (confidence >= 0.4) return 'text-amber-700'
  return 'text-rose-700'
}

export default function ConfidenceBar({ confidence, showLabel = true }: ConfidenceBarProps) {
  const pct = Math.round(confidence * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor(confidence)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-semibold tabular-nums ${getTextColor(confidence)}`}>
          {pct}%
        </span>
      )}
    </div>
  )
}
