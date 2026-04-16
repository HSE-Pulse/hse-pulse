import { ArrowRight, Download, Github, Linkedin, Shield } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

const impactStats = [
  { value: '92.9%', label: 'Wait Time Reduction', detail: 'Multi-Agent RL (28.4h to 2h)' },
  { value: '15+', label: 'Production Models', detail: '95% SLA across enterprise clients' },
  { value: '10M+', label: 'Daily Events', detail: '30+ microservices, 99.9% uptime' },
  { value: '4', label: 'Live ML Systems', detail: 'Running on this domain right now' },
]

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/8 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/6 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 text-center">
        {/* Work auth badge */}
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20 mb-8">
            <Shield className="w-3.5 h-3.5" />
            Stamp 1G | No sponsorship required
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <span className="text-gray-900">I build production AI</span>
          <br />
          <span className="gradient-text">that ships and scales</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <span className="text-gray-900 font-medium">Harishankar Somasundaram</span> | 11 years shipping production AI at scale.
          Led 8-engineer team delivering 15+ models at 95% SLA.
          GenAI, LLMs, RAG, Agentic AI, Multi-Agent RL, MLOps.
          MSc AI (First Class Honours).
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <a
            href="#projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-gray-900 font-medium text-sm hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/25"
          >
            View Live Projects
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={`${BASE}resume/HarishankarSomasundaram_CV.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-gray-600 font-medium text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Download CV
          </a>
        </div>

        {/* Impact stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          {impactStats.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-5 text-center">
              <div className="text-2xl sm:text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-gray-900 mb-1">{stat.label}</div>
              <div className="text-xs text-gray-400">{stat.detail}</div>
            </div>
          ))}
        </div>

        {/* Professional links */}
        <div className="flex items-center justify-center gap-6 animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <a
            href="https://github.com/HSE-Pulse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/harishankar-somasundaram"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
          <a
            href="mailto:harishankar.info@gmail.com"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            harishankar.info@gmail.com
          </a>
        </div>
      </div>
    </section>
  )
}
