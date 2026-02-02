import { Github, ExternalLink, Download } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import { config } from '../config'

interface Report {
  label: string
  url: string
}

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
  reports?: Report[]
}

const projects: Project[] = [
  {
    name: 'DES-MARL',
    tagline: 'Multi-Agent RL for Hospital Resource Optimisation',
    color: 'amber',
    iconLetter: 'D',
    iconBg: 'bg-amber-500/10',
    problem:
      'Hospital emergency departments face chronic overcrowding with unpredictable patient arrivals and constrained resources. Static staffing policies cannot adapt to real-time demand fluctuations across 9 interconnected clinical departments.',
    approach:
      'Novel DES-MARL framework integrating Discrete-Event Simulation (SimPy) with Multi-Agent Reinforcement Learning (MADDPG/MAPPO). 9 clinical departments modelled as autonomous agents with 12-dimensional state spaces. Trained on MIMIC-IV clinical data (7-day episodes) with 5-stage curriculum learning progressing from single-department to full-hospital coordination.',
    nonTrivial:
      'Achieved 92.9% wait time reduction (28.4h → 2h) and 137% throughput improvement (306 → 727 patients/episode). Multi-agent credit assignment across 9 departments with shared resources. Curriculum learning essential — agents fail to converge without staged complexity increases. Full reproducibility with MLflow experiment tracking.',
    stack: ['PyTorch', 'MADDPG', 'MAPPO', 'FastAPI', 'WebSocket', 'React', 'MIMIC-IV', 'Docker'],
    github: 'https://github.com/HSE-Pulse/medi-sync',
    demo: config.DESMARL_URL,
    reports: [
      { label: 'Applied Research Report', url: '/reports/desmarl-applied-research.pdf' },
      { label: 'Research Paper', url: '/reports/desmarl-research-paper.pdf' },
    ],
  },
  {
    name: 'CarePlanPlus',
    tagline: 'Dual-Methodology Treatment Pathway Recommendation',
    color: 'blue',
    iconLetter: 'C',
    iconBg: 'bg-blue-500/10',
    problem:
      'Mapping clinical diagnoses to structured treatment pathways requires understanding of medical terminology and procedure coding systems. Manual pathway construction is slow, error-prone, and struggles with multi-step treatment sequences across 15 NIES intervention categories.',
    approach:
      'Dual methodology: similarity-based collaborative filtering (k-means with k=20 clusters on 4,776 patient records from NIES 2020 dataset) and BERT-base-uncased fine-tuned on 163 patient-admission records mapped to 309 procedures across 15 NIES categories. Multi-step treatment pathway generation with ICD code integration and contextual enrichment from joined patient-admissions data.',
    nonTrivial:
      'Combining collaborative filtering with transformer-based classification provides complementary recommendations — population-level patterns from k-means clustering plus semantic understanding from BERT. 309 procedures across 15 categories required careful category balancing. Each generated pathway links to ICD procedure and drug codes with confidence scores.',
    stack: ['HuggingFace Transformers', 'BERT', 'Scikit-learn', 'FastAPI', 'React', 'MongoDB', 'Docker'],
    github: 'https://github.com/HSE-Pulse/care-plan-plus',
    demo: config.CAREPLANPLUS_URL,
    reports: [
      { label: 'Report', url: '/reports/careplanplus-report.pdf' },
    ],
  },
  {
    name: 'PulseNotes',
    tagline: 'Clinical Document Intelligence & RAG',
    color: 'purple',
    iconLetter: 'P',
    iconBg: 'bg-purple-500/10',
    problem:
      'Clinical notes contain critical patient information locked in unstructured text across multiple note sections. Clinicians need targeted extraction — chief complaints, diagnoses, medications — without reading entire discharge summaries.',
    approach:
      'Bio_ClinicalBERT for 768-dimensional semantic embeddings with FAISS vector indexing. RAG pipeline processing 22,184 chunks from 1,203 patients across MIMIC-IV discharge summaries. Section-aware extraction with regex-based NLU classifying query intent (segment extraction, patient lookup, semantic search). Ollama-backed MedLLaMA2 for response generation.',
    nonTrivial:
      'Sub-200ms query latency across 22,184 document chunks with FAISS vector indexing. Section-aware extraction handles irregular clinical document structure where headers vary between institutions. Hybrid retrieval combining vector similarity search with deterministic section parsing across 13 standardised note sections. MongoDB-backed document store with pre-computed embeddings.',
    stack: ['MedLLaMA2', 'Bio_ClinicalBERT', 'Ollama', 'FAISS', 'FastAPI', 'MongoDB', 'React', 'Docker'],
    github: 'https://github.com/HSE-Pulse/pulse-notes',
    demo: config.PULSENOTES_URL,
    reports: [
      { label: 'Report', url: '/reports/pulsenotes-report.pdf' },
    ],
  },
  {
    name: 'PulseFlow',
    tagline: 'LSTM ED Trolley Forecasting',
    color: 'rose',
    iconLetter: 'P',
    iconBg: 'bg-rose-500/10',
    problem:
      'Irish emergency departments track patients on trolleys awaiting admission — the HSE TrolleyGAR daily census. Hospital managers need accurate 7–14 day forecasts of trolley occupancy to pre-allocate beds and staff, but counts are noisy, seasonal, and influenced by flu waves, bank holidays, and regional surges.',
    approach:
      'LSTM regressor trained on historical HSE trolley data. Sliding-window input (7-day lookback) predicts 1- to 14-day trolley counts per hospital and nationally. FastAPI serves inference via REST, with predictions stored in MongoDB. React dashboard visualises historical vs. forecasted trends with confidence intervals.',
    nonTrivial:
      'Capturing weekly and seasonal periodicity in a single LSTM (2-layer, 64 hidden units) requires careful feature engineering and sequence length tuning. 5-feature input covering ED trolleys, ward trolleys, surge capacity, delayed transfers, and elderly patients. Model selection tracked via MLflow with automated hyperparameter sweeps. End-to-end pipeline from raw HSE open-data ingestion through training to live dashboard in a single Docker Compose deployment.',
    stack: ['PyTorch', 'LSTM', 'FastAPI', 'MongoDB', 'React', 'MLflow', 'Docker'],
    github: 'https://github.com/HSE-Pulse/pulse-flow',
    demo: config.PULSEFLOW_URL,
  },
  {
    name: 'HSE-Pulse Platform',
    tagline: 'Unified Healthcare AI Infrastructure',
    color: 'cyan',
    iconLetter: 'H',
    iconBg: 'bg-cyan-500/10',
    problem:
      'Running heterogeneous ML models (MADDPG/MAPPO, LSTM, BERT, ClinicalBERT) with different inference patterns and latency requirements in a single observable platform with shared experiment tracking and monitoring.',
    approach:
      'Microservice architecture with 17 containers orchestrated via Docker Compose behind an Nginx reverse proxy. Shared MLOps layer: MLflow for experiment tracking and model registry (MinIO S3 backend), Prometheus + Grafana for observability, with health checks and structured logging across all services.',
    nonTrivial:
      'Heterogeneous model serving — each service has different framework dependencies, inference patterns, and latency budgets — unified behind a single entry point. Full experiment lineage from training through deployment. EU-aligned design with explainability considerations and GDPR-aware data handling.',
    stack: ['Docker Compose', 'Nginx', 'MLflow', 'Prometheus', 'Grafana', 'MinIO', 'GitHub Actions'],
    github: 'https://github.com/HSE-Pulse/hse-pulse',
  },
]

const colorTextMap: Record<string, string> = {
  amber: 'text-amber-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  rose: 'text-rose-400',
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
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Live Demo
                      </a>
                    )}
                    {p.reports?.map((r) => (
                      <a
                        key={r.label}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {r.label}
                      </a>
                    ))}
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
