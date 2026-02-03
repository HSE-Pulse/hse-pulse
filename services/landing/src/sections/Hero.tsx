import { ArrowRight, Download, Github, Linkedin, FileText } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/8 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/6 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 text-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Open to AI leadership roles in Ireland
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <span className="text-white">Harishankar</span>{' '}
          <span className="gradient-text">Somasundaram</span>
        </h1>

        <p className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-4 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          Data Science Leader &amp; AI/ML Engineer
        </p>

        <p className="text-base text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
          11+ years specialising in Large Language Models, Multi-Agent Reinforcement
          Learning, Healthcare AI, and MLOps. Proven track record delivering
          production AI with measurable impact — 92.9% wait time reduction,
          137% throughput improvement, 40% faster delivery cycles.
        </p>

        {/* Expertise badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 animate-fade-up" style={{ animationDelay: '0.35s' }}>
          {['LLMs', 'Multi-Agent RL', 'Healthcare AI', 'MLOps', 'Deep Learning', 'NLP', 'Time Series', 'Cloud Platforms'].map((area) => (
            <span key={area} className="px-3 py-1 rounded-full text-xs text-slate-400 bg-white/5 border border-white/8">
              {area}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <a
            href="#projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium text-sm hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/20"
          >
            View Projects
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={`${BASE}resume/HarishankarSomasundaram_CV.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-slate-300 font-medium text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Download CV
          </a>
          <a
            href={`${BASE}resume/HarishankarSomasundaram_Resume.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-slate-300 font-medium text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Resume
          </a>
          <a
            href="#academic"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-slate-300 font-medium text-sm transition-all"
          >
            <FileText className="w-4 h-4" />
            Thesis &amp; Research
          </a>
        </div>

        {/* Professional links */}
        <div className="flex items-center justify-center gap-6 animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <a
            href="https://github.com/HSE-Pulse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/harishankar-somasundaram"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
          <a
            href="mailto:harishankar.info@gmail.com"
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            harishankar.info@gmail.com
          </a>
        </div>
      </div>
    </section>
  )
}
