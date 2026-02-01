import { Activity } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">HSE-Pulse</span>
          </div>
          <p className="text-sm text-slate-500">
            MSc Artificial Intelligence Capstone Project — Dublin Business School, 2025-2026
          </p>
          <p className="text-xs text-slate-600">
            Built by Harishankar Somasundaram
          </p>
        </div>
      </div>
    </footer>
  )
}
