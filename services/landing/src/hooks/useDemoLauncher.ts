import { useState, useCallback } from 'react'

const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || ''
const STATUS_URL = import.meta.env.VITE_STATUS_URL || ''

// Local development fallback URLs
const LOCAL_SERVICES: Record<string, string> = {
  careplanplus: '/careplanplus/',
  pulsenotes: '/pulsenotes/',
  pulseflow: '/pulseflow/',
  medisync: '/medisync/',
}

export interface DemoStatus {
  status: 'idle' | 'starting' | 'ready' | 'error'
  url?: string
  message?: string
}

export function useDemoLauncher() {
  const [demoStatus, setDemoStatus] = useState<Record<string, DemoStatus>>({})

  const launchDemo = useCallback(async (serviceName: string) => {
    // If no orchestrator URL configured, use local/direct links
    if (!ORCHESTRATOR_URL) {
      const localUrl = LOCAL_SERVICES[serviceName]
      if (localUrl) {
        window.open(localUrl, '_blank')
        setDemoStatus(prev => ({
          ...prev,
          [serviceName]: { status: 'ready', url: localUrl }
        }))
      }
      return
    }

    setDemoStatus(prev => ({
      ...prev,
      [serviceName]: { status: 'starting', message: 'Spinning up demo cluster...' }
    }))

    try {
      // Request spin-up from Cloud Function
      const response = await fetch(`${ORCHESTRATOR_URL}?service=${serviceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.status === 'ready') {
        setDemoStatus(prev => ({
          ...prev,
          [serviceName]: { status: 'ready', url: data.url }
        }))
        window.open(data.url, '_blank')
        return
      }

      if (data.status === 'error') {
        setDemoStatus(prev => ({
          ...prev,
          [serviceName]: { status: 'error', message: data.error }
        }))
        return
      }

      // Poll for readiness if service is deploying
      let attempts = 0
      const maxAttempts = 24 // 2 minutes with 5s intervals

      const pollInterval = setInterval(async () => {
        attempts++

        try {
          const statusRes = await fetch(`${STATUS_URL}?service=${serviceName}`)
          const statusData = await statusRes.json()

          if (statusData.status === 'ready' && statusData.url) {
            clearInterval(pollInterval)
            setDemoStatus(prev => ({
              ...prev,
              [serviceName]: { status: 'ready', url: statusData.url }
            }))
            window.open(statusData.url, '_blank')
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setDemoStatus(prev => ({
              ...prev,
              [serviceName]: {
                status: 'error',
                message: 'Timeout - demo took too long to start. Please try again.'
              }
            }))
          }
        } catch (e) {
          console.error('Status check failed:', e)
        }
      }, 5000)

    } catch (error) {
      console.error('Failed to launch demo:', error)
      setDemoStatus(prev => ({
        ...prev,
        [serviceName]: {
          status: 'error',
          message: 'Failed to start demo. Please try again.'
        }
      }))
    }
  }, [])

  const resetStatus = useCallback((serviceName: string) => {
    setDemoStatus(prev => ({
      ...prev,
      [serviceName]: { status: 'idle' }
    }))
  }, [])

  return { demoStatus, launchDemo, resetStatus }
}
