import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-rose-600" />
      </div>
      <p className="text-sm text-slate-700 font-medium mb-1">Something went wrong</p>
      <p className="text-xs text-slate-500 mb-4 max-w-md text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  )
}
