import { ArrowRight, Github, ExternalLink } from 'lucide-react'

export default function PlatformHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/8 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/6 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 text-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-white text-gray-500 border border-gray-200 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Production-grade AI Platform
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <span className="text-gray-900">HSE-</span>
          <span className="gradient-text">Pulse</span>
        </h1>

        <p className="text-xl sm:text-2xl text-gray-500 max-w-3xl mx-auto mb-4 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          AI-Driven Healthcare Intelligence Platform
        </p>

        <p className="text-base text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
          Five specialised AI services — Agentic AI orchestration with LangGraph,
          Multi-Agent RL hospital optimisation, BERT treatment pathway recommendation,
          ClinicalBERT document intelligence, and LSTM ED trolley forecasting — unified
          into a single observable, containerised platform.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-gray-900 font-medium text-sm hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/25"
          >
            Explore Platform
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#platform"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-gray-600 font-medium text-sm transition-all"
          >
            View Architecture
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Service preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <a href="#capabilities" className="glass glass-hover rounded-2xl p-5 text-left transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3">
              <span className="text-cyan-600 text-lg font-bold">A</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">HSE Pulse Agent</h3>
            <p className="text-xs text-gray-400">Agentic AI orchestration</p>
          </a>
          <a href="#capabilities" className="glass glass-hover rounded-2xl p-5 text-left transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <span className="text-emerald-600 text-lg font-bold">D</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">DES-MARL</h3>
            <p className="text-xs text-gray-400">Multi-Agent RL hospital optimisation</p>
          </a>
          <a href="#capabilities" className="glass glass-hover rounded-2xl p-5 text-left transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
              <span className="text-blue-600 text-lg font-bold">C</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">CarePlanPlus</h3>
            <p className="text-xs text-gray-400">BERT treatment pathway recommendation</p>
          </a>
          <a href="#capabilities" className="glass glass-hover rounded-2xl p-5 text-left transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
              <span className="text-purple-600 text-lg font-bold">P</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">PulseNotes</h3>
            <p className="text-xs text-gray-400">ClinicalBERT document intelligence &amp; RAG</p>
          </a>
          <a href="#capabilities" className="glass glass-hover rounded-2xl p-5 text-left transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <span className="text-amber-600 text-lg font-bold">P</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">PulseFlow</h3>
            <p className="text-xs text-gray-400">LSTM ED trolley forecasting</p>
          </a>
        </div>

        {/* Tech badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-12 animate-fade-up" style={{ animationDelay: '0.6s' }}>
          {['LangGraph', 'GPT-4o', 'PyTorch', 'MADDPG', 'BERT', 'LSTM', 'FastAPI', 'React', 'Docker', 'MLflow', 'Prometheus'].map((tech) => (
            <span key={tech} className="px-2.5 py-1 rounded-md text-xs text-gray-400 bg-gray-50 border border-gray-200">
              {tech}
            </span>
          ))}
        </div>

        {/* GitHub link */}
        <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.7s' }}>
          <a
            href="https://github.com/HSE-Pulse/hse-pulse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            github.com/HSE-Pulse/hse-pulse
          </a>
        </div>
      </div>
    </section>
  )
}
