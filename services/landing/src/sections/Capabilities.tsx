import {
  Heart, Brain, FileText, ExternalLink,
  Zap, TrendingUp, AlertTriangle, Stethoscope,
  Network, GitBranch, Search, BookOpen
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
}

function ServiceCard({
  colorClass, bgClass, borderClass,
  title, subtitle, description, model,
  features, techStack, demoUrl, metrics,
}: ServiceCardProps) {
  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all hover:border-white/10`}>
      {/* Header */}
      <div className={`${bgClass} px-6 py-5 border-b ${borderClass}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-bold ${colorClass}`}>{title}</h3>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass} opacity-80 hover:opacity-100 transition-opacity`}
          >
            Live Demo <ExternalLink className="w-3 h-3" />
          </a>
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
    title: 'MediSync',
    subtitle: 'Real-Time ICU Vitals Monitoring',
    description: 'Continuous physiological signal analysis using a stacked LSTM architecture trained on the MIMIC-III clinical database. Detects anomalous vital sign patterns with sub-second inference latency via WebSocket streaming.',
    model: 'Stacked LSTM (2-layer, 128 hidden units)',
    features: [
      { icon: Heart, label: 'Multi-channel vitals: HR, SpO2, SBP, DBP, RR, Temperature' },
      { icon: Zap, label: 'WebSocket real-time streaming with configurable frequency' },
      { icon: AlertTriangle, label: 'Threshold-based and ML-based anomaly detection' },
      { icon: TrendingUp, label: 'Historical trend analysis and pattern recognition' },
    ],
    techStack: [
      { label: 'PyTorch', color: 'green' },
      { label: 'LSTM', color: 'green' },
      { label: 'FastAPI', color: 'green' },
      { label: 'WebSocket', color: 'cyan' },
      { label: 'MIMIC-III', color: 'amber' },
    ],
    demoUrl: config.MEDISYNC_URL,
    metrics: [
      { label: 'Vital Channels', value: '6' },
      { label: 'Inference', value: '<50ms' },
      { label: 'Training Data', value: 'MIMIC-III' },
      { label: 'Streaming', value: 'Real-time' },
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
  },
  {
    color: 'purple',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/5',
    borderClass: 'border-purple-500/10',
    title: 'PulseNotes',
    subtitle: 'ClinicalBERT Medical Document Intelligence',
    description: 'Processes unstructured medical text through ClinicalBERT to extract clinical entities, classify document sentiment, and generate structured summaries. Supports discharge notes, radiology reports, and clinical narratives.',
    model: 'Bio_ClinicalBERT (emilyalsentzer/Bio_ClinicalBERT)',
    features: [
      { icon: FileText, label: 'Medical named entity recognition (NER)' },
      { icon: BookOpen, label: 'Clinical document summarisation' },
      { icon: Network, label: 'Sentiment and severity classification' },
      { icon: Search, label: 'Entity linking to medical ontologies' },
    ],
    techStack: [
      { label: 'ClinicalBERT', color: 'purple' },
      { label: 'NER', color: 'purple' },
      { label: 'FastAPI', color: 'cyan' },
      { label: 'HuggingFace', color: 'purple' },
      { label: 'spaCy', color: 'amber' },
    ],
    demoUrl: config.PULSENOTES_URL,
    metrics: [
      { label: 'Entity Types', value: '7+' },
      { label: 'Model Base', value: 'ClinicalBERT' },
      { label: 'Doc Types', value: '3' },
      { label: 'Processing', value: 'Batch/Single' },
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
          description="Three domain-specific deep learning services, each independently trained, containerised, and deployed with dedicated React dashboards."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </div>
    </section>
  )
}
