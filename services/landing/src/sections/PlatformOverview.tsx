import { Activity, Database, Shield, Layers, Cpu, BarChart3 } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import TechBadge from '../components/TechBadge'

const stats = [
  { label: 'ML Services', value: '4' },
  { label: 'Containers', value: '17' },
  { label: 'Model Architectures', value: 'MARL / LSTM / BERT' },
  { label: 'Observability', value: 'Full Stack' },
]

const pillars = [
  {
    icon: Cpu,
    title: 'Deep Learning Inference',
    description: 'Four domain-specific models — MADDPG/MAPPO for hospital resource optimisation, LSTM for ED trolley forecasting, BERT for treatment pathways, ClinicalBERT for document analysis — each served via FastAPI with GPU-optional inference.',
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
          description="A containerised microservice platform integrating four specialised healthcare AI services with production-grade observability, experiment tracking, and infrastructure automation."
        />

        {/* Stats bar */}
        <div className="glass rounded-2xl p-6 mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture diagram */}
        <div className="glass rounded-2xl p-8 mb-16">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">System Architecture</h3>
          <div className="space-y-4">
            {/* Client layer */}
            <div className="flex justify-center">
              <div className="px-6 py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-sm text-primary-400 font-medium">
                Client / Browser
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-px h-6 bg-slate-700" />
            </div>

            {/* Nginx proxy */}
            <div className="flex justify-center">
              <div className="px-8 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 font-medium">
                Nginx Reverse Proxy — :8090
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

            {/* Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-emerald-400 mb-1">DES-MARL</div>
                <div className="text-xs text-slate-500 mb-2">Multi-Agent RL</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="PyTorch" color="green" />
                  <TechBadge label="MADDPG" color="green" />
                  <TechBadge label="WebSocket" color="green" />
                </div>
              </div>
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-blue-400 mb-1">CarePlanPlus</div>
                <div className="text-xs text-slate-500 mb-2">BERT Recommender</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="PyTorch" color="blue" />
                  <TechBadge label="BERT" color="blue" />
                  <TechBadge label="HuggingFace" color="blue" />
                </div>
              </div>
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-purple-400 mb-1">PulseNotes</div>
                <div className="text-xs text-slate-500 mb-2">ClinicalBERT RAG</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="ClinicalBERT" color="purple" />
                  <TechBadge label="FAISS" color="purple" />
                  <TechBadge label="RAG" color="purple" />
                </div>
              </div>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4 text-center">
                <div className="text-sm font-semibold text-amber-400 mb-1">PulseFlow</div>
                <div className="text-xs text-slate-500 mb-2">LSTM ED Forecasting</div>
                <div className="flex flex-wrap justify-center gap-1">
                  <TechBadge label="PyTorch" color="amber" />
                  <TechBadge label="LSTM" color="amber" />
                  <TechBadge label="MongoDB" color="amber" />
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
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                <div className="text-xs font-medium text-slate-400">MongoDB</div>
                <div className="text-xs text-slate-600">Clinical Data</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                <div className="text-xs font-medium text-slate-400">MLflow + MinIO</div>
                <div className="text-xs text-slate-600">Experiment Tracking</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                <div className="text-xs font-medium text-slate-400">Prometheus + Grafana</div>
                <div className="text-xs text-slate-600">Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="glass glass-hover rounded-2xl p-6 transition-all">
              <pillar.icon className="w-5 h-5 text-primary-400 mb-4" />
              <h3 className="text-sm font-semibold text-white mb-2">{pillar.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
