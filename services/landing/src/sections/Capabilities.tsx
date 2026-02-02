import {
  Brain, FileText, ExternalLink, Download,
  Stethoscope, Layers,
  Network, GitBranch, Search, BookOpen,
  Activity, Calendar, Building2, BarChart3
} from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import TechBadge from '../components/TechBadge'
import { config } from '../config'

interface ServiceFeature {
  icon: React.ComponentType<{ className?: string }>
  label: string
}

interface ServiceCardProps {
  color: string
  colorClass: string
  bgClass: string
  borderClass: string
  title: string
  subtitle: string
  description: string
  model: string
  features: ServiceFeature[]
  techStack: { label: string; color: 'green' | 'blue' | 'purple' | 'cyan' | 'amber' }[]
  demoUrl: string
  metrics: { label: string; value: string }[]
  reports?: { label: string; url: string }[]
}

function ServiceCard({
  colorClass, bgClass, borderClass,
  title, subtitle, description, model,
  features, techStack, demoUrl, metrics, reports,
}: ServiceCardProps) {
  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all hover:border-white/10`}>
      {/* Header */}
      <div className={`${bgClass} px-6 py-5 border-b ${borderClass}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-bold ${colorClass}`}>{title}</h3>
          <div className="flex items-center gap-3">
            {reports?.map((r) => (
              <a
                key={r.label}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Download className="w-3 h-3" /> {r.label}
              </a>
            ))}
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass} opacity-80 hover:opacity-100 transition-opacity`}
            >
              Live Demo <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>

        {/* Model */}
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider">Model</span>
          <p className="text-sm text-white font-medium mt-1">{model}</p>
        </div>

        {/* Features */}
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f.label} className="flex items-center gap-2.5">
              <f.icon className={`w-3.5 h-3.5 ${colorClass} flex-shrink-0`} />
              <span className="text-sm text-slate-400">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="bg-white/3 rounded-lg p-3">
              <div className="text-sm font-semibold text-white">{m.value}</div>
              <div className="text-xs text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {techStack.map((t) => (
            <TechBadge key={t.label} label={t.label} color={t.color} />
          ))}
        </div>
      </div>
    </div>
  )
}

const services: ServiceCardProps[] = [
  {
    color: 'emerald',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/5',
    borderClass: 'border-emerald-500/10',
    title: 'DES-MARL',
    subtitle: 'Multi-Agent RL Hospital Optimisation',
    description: 'Discrete-Event Simulation integrated with Multi-Agent Reinforcement Learning for dynamic hospital staff allocation. 9 clinical departments modelled as autonomous agents with 5-stage curriculum learning.',
    model: 'MADDPG / MAPPO (2-layer, 256 hidden units)',
    features: [
      { icon: Network, label: 'Multi-agent coordination across 9 clinical departments' },
      { icon: Activity, label: 'Real-time DES simulation with WebSocket streaming' },
      { icon: Layers, label: '5-stage curriculum learning from single to full hospital' },
      { icon: BarChart3, label: '92.9% wait time reduction, 137% throughput improvement' },
    ],
    techStack: [
      { label: 'PyTorch', color: 'green' },
      { label: 'MADDPG', color: 'green' },
      { label: 'FastAPI', color: 'cyan' },
      { label: 'WebSocket', color: 'cyan' },
      { label: 'MIMIC-IV', color: 'amber' },
    ],
    demoUrl: config.DESMARL_URL,
    metrics: [
      { label: 'Departments', value: '9' },
      { label: 'Wait Reduction', value: '92.9%' },
      { label: 'Throughput', value: '+137%' },
      { label: 'Curriculum', value: '5 stages' },
    ],
    reports: [
      { label: 'Report', url: '/reports/desmarl-applied-research.pdf' },
      { label: 'Paper', url: '/reports/desmarl-research-paper.pdf' },
    ],
  },
  {
    color: 'blue',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/5',
    borderClass: 'border-blue-500/10',
    title: 'CarePlanPlus',
    subtitle: 'BERT Treatment Pathway Recommendation',
    description: 'Generates personalised treatment pathway recommendations by encoding patient diagnosis profiles through a fine-tuned BERT model. Trained on real patient-admission-procedure associations from the MIMIC clinical dataset.',
    model: 'BERT-base-uncased (fine-tuned, 96 procedure classes)',
    features: [
      { icon: Brain, label: 'ICD diagnosis code encoding with BERT embeddings' },
      { icon: GitBranch, label: 'Multi-step treatment pathway generation' },
      { icon: Stethoscope, label: 'Confidence-scored procedure recommendations' },
      { icon: Search, label: 'ICD code search with autocomplete' },
    ],
    techStack: [
      { label: 'PyTorch', color: 'blue' },
      { label: 'BERT', color: 'blue' },
      { label: 'HuggingFace', color: 'blue' },
      { label: 'FastAPI', color: 'cyan' },
      { label: 'MIMIC', color: 'amber' },
    ],
    demoUrl: config.CAREPLANPLUS_URL,
    metrics: [
      { label: 'Procedure Classes', value: '96' },
      { label: 'Training Records', value: '163' },
      { label: 'Model Base', value: 'BERT' },
      { label: 'ICD Codes', value: '71K+' },
    ],
    reports: [
      { label: 'Report', url: '/reports/careplanplus-report.pdf' },
    ],
  },
  {
    color: 'purple',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/5',
    borderClass: 'border-purple-500/10',
    title: 'PulseNotes',
    subtitle: 'ClinicalBERT Document Intelligence & RAG',
    description: 'Semantic search and section-aware extraction over clinical discharge summaries using Bio_ClinicalBERT embeddings with FAISS vector indexing. Supports query intent classification for segment extraction, patient lookup, and semantic retrieval.',
    model: 'Bio_ClinicalBERT (emilyalsentzer/Bio_ClinicalBERT)',
    features: [
      { icon: Search, label: 'Semantic search via FAISS over 22,184 document chunks' },
      { icon: FileText, label: 'Section-aware extraction across 13 clinical note sections' },
      { icon: BookOpen, label: 'Query intent classification: segment, patient, semantic' },
      { icon: Network, label: 'Keyword-based clinical entity extraction' },
    ],
    techStack: [
      { label: 'ClinicalBERT', color: 'purple' },
      { label: 'FAISS', color: 'purple' },
      { label: 'FastAPI', color: 'cyan' },
      { label: 'HuggingFace', color: 'purple' },
      { label: 'MongoDB', color: 'amber' },
    ],
    demoUrl: config.PULSENOTES_URL,
    metrics: [
      { label: 'Document Chunks', value: '22K+' },
      { label: 'Model Base', value: 'ClinicalBERT' },
      { label: 'Patients', value: '1,203' },
      { label: 'Note Sections', value: '13' },
    ],
    reports: [
      { label: 'Report', url: '/reports/pulsenotes-report.pdf' },
    ],
  },
  {
    color: 'amber',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/10',
    title: 'PulseFlow',
    subtitle: 'LSTM ED Trolley Forecasting',
    description: 'Predicts emergency department trolley counts across Irish hospitals using a multi-layer LSTM network trained on HSE trolley data. Generates 1-14 day forecasts with confidence intervals to support capacity planning.',
    model: 'LSTM Regressor (2-layer, 64 hidden units)',
    features: [
      { icon: Activity, label: '5-feature input: ED trolleys, ward trolleys, surge capacity, delayed transfers, elderly' },
      { icon: Calendar, label: '1-14 day rolling forecast with confidence intervals' },
      { icon: Building2, label: '8 Irish hospitals with real HSE area mapping' },
      { icon: BarChart3, label: 'Historical data explorer with trend visualisation' },
    ],
    techStack: [
      { label: 'PyTorch', color: 'amber' },
      { label: 'LSTM', color: 'amber' },
      { label: 'FastAPI', color: 'cyan' },
      { label: 'MongoDB', color: 'green' },
      { label: 'HSE Data', color: 'amber' },
    ],
    demoUrl: config.PULSEFLOW_URL,
    metrics: [
      { label: 'Input Features', value: '5' },
      { label: 'Forecast Range', value: '1-14 days' },
      { label: 'Hospitals', value: '8' },
      { label: 'Model', value: 'LSTM' },
    ],
  },
]

export default function Capabilities() {
  return (
    <section id="capabilities" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Services"
          title="Platform Capabilities"
          description="Four domain-specific deep learning services, each independently trained, containerised, and deployed with dedicated React dashboards."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </div>
    </section>
  )
}
