import { Github, ExternalLink, FileText } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import { config } from '../config'

interface Project {
  name: string
  tagline: string
  color: string
  iconLetter: string
  iconBg: string
  problem: string
  approach: string
  nonTrivial: string
  stack: string[]
  github: string
  demo?: string
  report?: string
}

const projects: Project[] = [
  {
    name: 'MediSync',
    tagline: 'Real-Time ICU Vital Signs Monitoring',
    color: 'emerald',
    iconLetter: 'M',
    iconBg: 'bg-emerald-500/10',
    problem:
      'ICU patients generate continuous multivariate vital sign streams. Clinicians need early warning of physiological deterioration — not after-the-fact alerts from simple threshold rules.',
    approach:
      'Stacked LSTM (2-layer, 128 hidden units) trained on MIMIC-III ICU data. Processes 6 concurrent vital channels (HR, SpO\u2082, SBP, DBP, RR, Temperature) with sliding-window inference. The model serves predictions through a FastAPI backend with WebSocket streaming to a React dashboard.',
    nonTrivial:
      'Sub-50ms inference latency under continuous WebSocket streaming. Multi-channel time series requires careful per-channel normalisation and synchronised windowing. Prometheus integration captures inference latency histograms and prediction throughput in production.',
    stack: ['PyTorch', 'FastAPI', 'WebSocket', 'React', 'Prometheus', 'Docker'],
    github: 'https://github.com/HSE-Pulse/hse-pulse',
    demo: config.MEDISYNC_URL,
  },
  {
    name: 'CarePlanPlus',
    tagline: 'BERT-Based Treatment Pathway Recommendation',
    color: 'blue',
    iconLetter: 'C',
    iconBg: 'bg-blue-500/10',
    problem:
      'Mapping unstructured clinical text to structured treatment pathways requires understanding of medical terminology and ICD coding systems. Manual pathway construction is slow and error-prone.',
    approach:
      'BERT-base-uncased fine-tuned on 96 procedure classes with ICD code integration. Multi-step treatment pathway generation from clinical descriptions with joined patient-admissions dataset for contextual enrichment.',
    nonTrivial:
      'Small training set (163 records) required careful regularisation and augmentation strategies. Integration with 71K+ ICD codes for procedure encoding. Generates multi-step treatment pathways, not just single-label classification — each step links to ICD procedure and drug codes.',
    stack: ['HuggingFace Transformers', 'BERT', 'FastAPI', 'React', 'MongoDB', 'Docker'],
    github: 'https://github.com/HSE-Pulse/hse-pulse',
    demo: config.CAREPLANPLUS_URL,
  },
  {
    name: 'PulseNotes',
    tagline: 'Clinical Document Intelligence & RAG',
    color: 'purple',
    iconLetter: 'P',
    iconBg: 'bg-purple-500/10',
    problem:
      'Clinical notes contain critical patient information locked in unstructured text. Clinicians need targeted extraction — chief complaints, diagnoses, medications — without reading entire discharge summaries.',
    approach:
      'Bio_ClinicalBERT for semantic search and named entity recognition. RAG pipeline with section-aware extraction from 1,200+ MIMIC-IV discharge summaries. Natural language query parsing classifies intent (segment extraction, patient lookup, semantic search) and routes to the appropriate retrieval strategy.',
    nonTrivial:
      'Section-aware extraction handles the irregular structure of clinical documents where headers vary between institutions. The RAG pipeline combines vector similarity with regex-based NLU for query classification. Query latency under 20ms with MongoDB-backed document store and FAISS indexing.',
    stack: ['Bio_ClinicalBERT', 'FastAPI', 'MongoDB', 'FAISS', 'React', 'Docker'],
    github: 'https://github.com/HSE-Pulse/hse-pulse',
    demo: config.PULSENOTES_URL,
  },
  {
    name: 'HSE-Pulse Platform',
    tagline: 'Unified Healthcare AI Infrastructure',
    color: 'cyan',
    iconLetter: 'H',
    iconBg: 'bg-cyan-500/10',
    problem:
      'Running heterogeneous ML models (LSTM, BERT, ClinicalBERT) with different inference patterns and latency requirements in a single observable platform with shared experiment tracking and monitoring.',
    approach:
      'Microservice architecture with 15 containers orchestrated via Docker Compose behind an Nginx reverse proxy. Shared MLOps layer: MLflow for experiment tracking and model registry (MinIO S3 backend), Prometheus + Grafana for observability, with health checks and structured logging across all services.',
    nonTrivial:
      'Heterogeneous model serving — each service has different framework dependencies, inference patterns, and latency budgets — unified behind a single entry point. Full experiment lineage from training through deployment. EU-aligned design with explainability considerations and GDPR-aware data handling.',
    stack: ['Docker Compose', 'Nginx', 'MLflow', 'Prometheus', 'Grafana', 'MinIO', 'GitHub Actions'],
    github: 'https://github.com/HSE-Pulse/hse-pulse',
  },
]

const colorTextMap: Record<string, string> = {
  emerald: 'text-emerald-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
}

export default function Projects() {
  return (
    <section id="projects" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Demo Projects"
          title="Selected Work"
          description="Each project addresses a specific clinical or infrastructure problem with measurable technical depth. All are deployed and running on this platform."
        />

        <div className="space-y-8">
          {projects.map((p) => (
            <div key={p.name} className="glass rounded-2xl p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Header */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                      <span className={`text-lg font-bold ${colorTextMap[p.color]}`}>{p.iconLetter}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                      <p className="text-xs text-slate-500">{p.tagline}</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Problem</span>
                      <p className="mt-1">{p.problem}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Technical Approach</span>
                      <p className="mt-1">{p.approach}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">What Makes It Non-Trivial</span>
                      <p className="mt-1">{p.nonTrivial}</p>
                    </div>
                  </div>

                  {/* Tech stack */}
                  <div className="flex flex-wrap gap-1.5 mt-5">
                    {p.stack.map((tech) => (
                      <span key={tech} className="px-2.5 py-1 rounded-md text-xs text-slate-400 bg-white/5 border border-white/5">
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Links */}
                  <div className="flex flex-wrap gap-3 mt-5">
                    <a
                      href={p.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                      Source Code
                    </a>
                    {p.demo && (
                      <a
                        href={p.demo}
                        className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Live Demo
                      </a>
                    )}
                    {p.report && (
                      <a
                        href={p.report}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Report
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
