import { Activity, Database, Shield, Layers, Cpu, BarChart3 } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import TechBadge from '../components/TechBadge'

const stats = [
  { label: 'AI Services', value: '5' },
  { label: 'Containers', value: '19' },
  { label: 'Architectures', value: 'Agentic / MARL / LSTM / BERT' },
  { label: 'Observability', value: 'Full Stack' },
]

const pillars = [
  {
    icon: Cpu,
    title: 'Deep Learning & Agentic Inference',
    description: 'Five AI services - LangGraph agentic orchestrator with GPT-4o, MADDPG/MAPPO hospital optimisation, BERT treatment pathways, ClinicalBERT document RAG, and LSTM ED trolley forecasting - each served via FastAPI.',
  },
  {
    icon: Layers,
    title: 'Microservice Architecture',
    description: 'Each service is independently deployable with its own Dockerfile, health checks, and API contracts. Nginx reverse proxy provides unified routing with rate limiting.',
  },
  {
    icon: Database,
    title: 'Data Layer',
    description: 'MongoDB for persistent clinical data, Redis for caching, MinIO for S3-compatible model artifact storage. All data services run on an isolated backend network.',
  },
  {
    icon: BarChart3,
    title: 'Experiment Tracking',
    description: 'MLflow tracks training runs, hyperparameters, and model versions. Each service logs metrics during training and registers production model checkpoints.',
  },
  {
    icon: Shield,
    title: 'EU-Aligned Design',
    description: 'Explainable inference outputs (confidence scores, feature attribution). Architecture supports data residency requirements for GDPR-regulated healthcare contexts.',
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'Prometheus scrapes service metrics. Grafana dashboards visualise inference latency, throughput, error rates, and model drift indicators.',
  },
]

export default function PlatformOverview() {
  return (
    <section id="platform" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Architecture"
          title="Platform Overview"
          description="A containerised microservice platform integrating five specialised healthcare AI services - including an agentic orchestrator - with production-grade observability, experiment tracking, and infrastructure automation."
        />

        {/* Stats bar */}
        <div className="glass rounded-2xl p-6 mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture diagram */}
        <div className="glass rounded-2xl p-8 mb-16">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">System Architecture</h3>
          <div className="space-y-4" role="img" aria-label="System architecture: client browser through Nginx reverse proxy to HSE Pulse Agent orchestrator, which routes to four AI services (DES-MARL, CarePlanPlus, PulseNotes, PulseFlow), backed by MongoDB, MLflow with MinIO, and Prometheus with Grafana">
            {/* Client layer */}
            <div className="flex justify-center">
              <div className="px-6 py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-sm text-primary-600 font-medium">
                Client / Browser
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-px h-6 bg-slate-700" />
            </div>

            {/* Nginx proxy */}
            <div className="flex justify-center">
              <div className="px-8 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-600 font-medium">
                Nginx Reverse Proxy - :8090
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex items-end gap-12">
                <div className="w-px h-8 bg-slate-700" />
                <div className="w-px h-8 bg-slate-700" />
                <div className="w-px h-8 bg-slate-700" />
                <div className="w-px h-8 bg-slate-700" />
              </div>
            </div>

            {/* Agentic orchestrator */}
            <div className="flex justify-center">
              <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/15 p-4 text-center max-w-md w-full">
                <div className="text-sm font-semibold text-cyan-600 mb-1">HSE Pulse Agent</div>
                <div className="text-xs text-gray-500 mb-2">Agentic AI Orchestrator</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="LangGraph" color="cyan" />
                  <TechBadge label="GPT-4o" color="cyan" />
                  <TechBadge label="Tool Chaining" color="cyan" />
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex items-end gap-8">
                <div className="w-px h-6 bg-slate-700" />
                <div className="w-px h-6 bg-slate-700" />
                <div className="w-px h-6 bg-slate-700" />
                <div className="w-px h-6 bg-slate-700" />
              </div>
            </div>

            {/* Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-emerald-600 mb-1">DES-MARL</div>
                <div className="text-xs text-gray-500 mb-2">Multi-Agent RL</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="PyTorch" color="green" />
                  <TechBadge label="MADDPG" color="green" />
                </div>
              </div>
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-blue-600 mb-1">CarePlanPlus</div>
                <div className="text-xs text-gray-500 mb-2">BERT Recommender</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="BERT" color="blue" />
                  <TechBadge label="HuggingFace" color="blue" />
                </div>
              </div>
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-purple-600 mb-1">PulseNotes</div>
                <div className="text-xs text-gray-500 mb-2">ClinicalBERT RAG</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="ClinicalBERT" color="purple" />
                  <TechBadge label="FAISS" color="purple" />
                </div>
              </div>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-amber-600 mb-1">PulseFlow</div>
                <div className="text-xs text-gray-500 mb-2">LSTM Forecasting</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="PyTorch" color="amber" />
                  <TechBadge label="LSTM" color="amber" />
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="flex items-start gap-12">
                <div className="w-px h-8 bg-slate-700" />
                <div className="w-px h-8 bg-slate-700" />
                <div className="w-px h-8 bg-slate-700" />
                <div className="w-px h-8 bg-slate-700" />
              </div>
            </div>

            {/* Data layer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-gray-100 border border-gray-200 p-3 text-center">
                <div className="text-xs font-medium text-gray-500">MongoDB</div>
                <div className="text-xs text-gray-500">Clinical Data</div>
              </div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 p-3 text-center">
                <div className="text-xs font-medium text-gray-500">MLflow + MinIO</div>
                <div className="text-xs text-gray-500">Experiment Tracking</div>
              </div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 p-3 text-center">
                <div className="text-xs font-medium text-gray-500">Prometheus + Grafana</div>
                <div className="text-xs text-gray-500">Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="glass glass-hover rounded-2xl p-6 transition-all">
              <pillar.icon className="w-5 h-5 text-primary-600 mb-4" />
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{pillar.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
