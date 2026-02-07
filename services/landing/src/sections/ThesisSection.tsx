import { BookOpen, Microscope, Target, Lightbulb, Download } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const BASE = import.meta.env.BASE_URL

const researchAreas = [
  {
    icon: Microscope,
    title: 'Research Question',
    content: 'How can domain-specific deep learning architectures be integrated into a unified, observable platform to improve clinical decision support across hospital resource optimisation, treatment planning, document analysis, and capacity forecasting?',
  },
  {
    icon: Target,
    title: 'Methodology',
    content: 'Design-science research approach: four specialised ML services — DES-MARL (9 clinical departments, MADDPG/MAPPO), CarePlanPlus (BERT, 96 procedure classes), PulseNotes (ClinicalBERT RAG, 22,184 chunks), and PulseFlow (LSTM, 12 hospitals) — each evaluated against clinical benchmarks (MIMIC-IV, HSE TrolleyGAR, NIES 2020), integrated through microservice architecture, and assessed for production viability.',
  },
  {
    icon: Lightbulb,
    title: 'Key Contributions',
    content: 'Demonstrates that heterogeneous deep learning models (MADDPG/MAPPO, LSTM, BERT, ClinicalBERT, MedLLaMA2) can be deployed as independent microservices with shared MLOps infrastructure (MLflow, Prometheus, Grafana), orchestrated across 17 Docker containers, achieving inference latencies suitable for clinical workflows.',
  },
]

export default function ThesisSection() {
  return (
    <section id="thesis" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Research"
          title="Thesis & Academic Context"
          description="HSE-Pulse serves as the capstone project for an MSc in Artificial Intelligence, investigating production-grade deployment of healthcare-specific deep learning systems."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: thesis card */}
          <div className="glass rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">MSc Capstone Dissertation</h3>
                <p className="text-sm text-slate-400">Dublin Business School, 2025 - 2026</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Programme</span>
                <p className="text-sm text-slate-300 mt-1">Master of Science in Artificial Intelligence</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Focus Areas</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    'Healthcare AI',
                    'Deep Learning',
                    'MLOps',
                    'Microservice Architecture',
                    'Clinical NLP',
                    'Time Series Analysis',
                    'Reinforcement Learning',
                    'RAG',
                  ].map((area) => (
                    <span
                      key={area}
                      className="px-2.5 py-1 rounded-md text-xs text-primary-400 bg-primary-500/10 border border-primary-500/15"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Clinical Datasets</span>
                <p className="text-sm text-slate-300 mt-1">
                  MIMIC-IV (Medical Information Mart for Intensive Care) — de-identified clinical data from Beth Israel Deaconess Medical Center. HSE TrolleyGAR — Irish hospital trolley census data. NIES 2020 — Nursing Interventions Equivalence Scale used by CarePlanPlus for procedure classification.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`${BASE}reports/desmarl-applied-research.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 text-sm font-medium hover:bg-primary-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Applied Research PDF
              </a>
            </div>
          </div>

          {/* Right: research details */}
          <div className="space-y-5">
            {researchAreas.map((area) => (
              <div key={area.title} className="glass glass-hover rounded-2xl p-6 transition-all">
                <div className="flex items-start gap-3">
                  <area.icon className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">{area.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{area.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Technical scope */}
            <div className="glass rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-white mb-3">Technical Scope</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'ML Frameworks', value: 'PyTorch, HuggingFace' },
                  { label: 'Serving', value: 'FastAPI, Uvicorn' },
                  { label: 'Frontend', value: 'React 19, TypeScript' },
                  { label: 'Infra', value: 'Docker Compose, Nginx' },
                  { label: 'Tracking', value: 'MLflow, MinIO' },
                  { label: 'Monitoring', value: 'Prometheus, Grafana' },
                  { label: 'Data', value: 'MongoDB, FAISS' },
                  { label: 'LLM Inference', value: 'Ollama, MedLLaMA2' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="text-sm text-slate-300">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
