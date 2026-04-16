interface TechBadgeProps {
  label: string
  color?: 'blue' | 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'slate'
}

const colorMap = {
  blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  green: 'bg-green-500/10 text-green-600 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  red: 'bg-red-500/10 text-red-600 border-red-500/20',
  slate: 'bg-slate-500/10 text-gray-500 border-slate-500/20',
}

export default function TechBadge({ label, color = 'blue' }: TechBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${colorMap[color]}`}
    >
      {label}
    </span>
  )
}
