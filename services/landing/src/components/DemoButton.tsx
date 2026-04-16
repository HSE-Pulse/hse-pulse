import { Loader2, Play, ExternalLink, AlertCircle } from 'lucide-react'
import { useDemoLauncher } from '../hooks/useDemoLauncher'

interface DemoButtonProps {
  serviceName: string
  label?: string
  className?: string
}

export function DemoButton({ serviceName, label = 'Live Demo', className = '' }: DemoButtonProps) {
  const { demoStatus, launchDemo, resetStatus } = useDemoLauncher()
  const status = demoStatus[serviceName]

  const handleClick = () => {
    if (status?.status === 'error') {
      resetStatus(serviceName)
      return
    }
    if (status?.status === 'ready' && status.url) {
      window.open(status.url, '_blank')
    } else if (status?.status !== 'starting') {
      launchDemo(serviceName)
    }
  }

  const getButtonStyles = () => {
    const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all'

    switch (status?.status) {
      case 'starting':
        return `${base} bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 cursor-wait`
      case 'ready':
        return `${base} bg-green-500/20 text-green-600 border border-green-500/30 hover:bg-green-500/30`
      case 'error':
        return `${base} bg-red-500/20 text-red-600 border border-red-500/30 hover:bg-red-500/30`
      default:
        return `${base} bg-primary-500/20 text-primary-600 border border-primary-500/30 hover:bg-primary-500/30`
    }
  }

  const getContent = () => {
    switch (status?.status) {
      case 'starting':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Starting cluster...</span>
          </>
        )
      case 'ready':
        return (
          <>
            <ExternalLink className="w-4 h-4" />
            <span>Open Demo</span>
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Retry</span>
          </>
        )
      default:
        return (
          <>
            <Play className="w-4 h-4" />
            <span>{label}</span>
          </>
        )
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={status?.status === 'starting'}
        className={`${getButtonStyles()} ${className}`}
        title={status?.message}
      >
        {getContent()}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {status?.status === 'starting' && (
          <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
            Spinning up ML cluster (~30s)
          </div>
        )}

        {status?.status === 'error' && status.message && (
          <div className="absolute -bottom-6 left-0 text-xs text-red-600 max-w-48 truncate">
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default DemoButton
