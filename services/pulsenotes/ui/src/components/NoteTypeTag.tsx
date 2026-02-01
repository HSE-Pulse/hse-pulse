import { getNoteTypeColor, getNoteTypeLabel } from '../data/useNotesData'

interface NoteTypeTagProps {
  type: string
  size?: 'sm' | 'md'
}

export default function NoteTypeTag({ type, size = 'sm' }: NoteTypeTagProps) {
  const color = getNoteTypeColor(type)
  const label = getNoteTypeLabel(type)

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  )
}
