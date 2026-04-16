import { GraduationCap, Download, BookOpen, Brain, Activity } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const BASE = import.meta.env.BASE_URL

const documents = [
  {
    icon: BookOpen,
    title: 'MSc Thesis',
    subtitle: 'DES-MARL: Multi-Agent Reinforcement Learning for Hospital Resource Optimisation',
    context: 'MSc Artificial Intelligence — Dublin Business School, 2025–2026',
    description:
      'Develops a novel framework integrating Discrete-Event Simulation with Multi-Agent Reinforcement Learning (MADDPG/MAPPO) for dynamic hospital staff allocation. Evaluated on MIMIC-IV clinical data achieving 92.9% wait time reduction and 137% throughput improvement.',
    href: `${BASE}reports/desmarl-applied-research.pdf`,
  },
  {
    icon: Brain,
    title: 'CarePlanPlus Report',
    subtitle: 'BERT-Based Nursing Intervention Recommendation System',
    context: 'MSc AI — Project Report, 2025',
    description:
      'Covers the CarePlanPlus service: BERT-base-uncased classifier fine-tuned on 163 patient-admission records predicting from 96 procedure classes. Includes NIES 2020 satisfaction analytics, preprocessing, training pipeline, and evaluation metrics.',
    href: `${BASE}reports/careplanplus-report.pdf`,
  },
  {
    icon: Activity,
    title: 'PulseNotes Report',
    subtitle: 'ClinicalBERT RAG for Clinical Document Analysis',
    context: 'MSc AI — Project Report, 2025',
    description:
      'Documents the PulseNotes service: ClinicalBERT-based RAG pipeline processing 22,184 chunks from 1,203 patients using FAISS vector search for clinical document retrieval and question answering.',
    href: `${BASE}reports/pulsenotes-report.pdf`,
  },
]

export default function Academic() {
  return (
    <section id="academic" className="section-padding relative bg-gray-50/80">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Academic Work"
          title="Research &amp; Documents"
          description="Academic outputs from my MSc in Artificial Intelligence and professional documents available for review."
        />

        {/* Degree summary */}
        <div className="glass rounded-2xl p-6 lg:p-8 mb-10 max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                MSc Artificial Intelligence
              </h3>
              <p className="text-sm text-primary-600 mb-3">
                Dublin Business School — First Class Honours (1:1) — 2025–2026
              </p>
              <div className="space-y-3 text-sm text-gray-500 leading-relaxed">
                <p>
                  <span className="text-gray-400 font-medium">Research question: </span>
                  How can domain-specific deep learning architectures — Multi-Agent Reinforcement
                  Learning, BERT, ClinicalBERT/RAG, and LSTM — be integrated into a unified,
                  observable platform to improve clinical decision support across hospital resource
                  optimisation, treatment planning, document analysis, and capacity forecasting?
                </p>
                <p>
                  <span className="text-gray-400 font-medium">Methodology: </span>
                  Four specialised ML services developed and evaluated against clinical benchmarks:{' '}
                  <strong className="text-gray-600">DES-MARL</strong> — 9 departments, 12-dim state,
                  MADDPG/MAPPO with curriculum learning;{' '}
                  <strong className="text-gray-600">CarePlanPlus</strong> — BERT classifier on 163
                  patient-admissions, 96 procedure classes with NIES analytics;{' '}
                  <strong className="text-gray-600">PulseNotes</strong> — ClinicalBERT RAG over
                  22,184 chunks from 1,203 patients via FAISS;{' '}
                  <strong className="text-gray-600">PulseFlow</strong> — LSTM with 5-feature input
                  across 12 hospitals for 1–14 day forecasts.
                </p>
                <p>
                  <span className="text-gray-400 font-medium">Key results: </span>
                  92.9% wait time reduction (28.4 h → 2 h), sub-200 ms inference latency, 96
                  procedure classes with NIES satisfaction analytics, 12 hospitals forecasted, 17 Docker
                  containers orchestrated via microservice architecture with MLflow tracking
                  and Prometheus/Grafana observability.
                </p>
              </div>

              {/* Focus areas */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  'Multi-Agent RL',
                  'MADDPG',
                  'MAPPO',
                  'Discrete-Event Simulation',
                  'Healthcare AI',
                  'MIMIC-IV',
                  'Curriculum Learning',
                  'BERT',
                  'ClinicalBERT',
                  'LSTM',
                  'NLP',
                  'RAG',
                  'MLOps',
                  'Docker',
                  'Microservices',
                ].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-md text-xs text-gray-500 bg-white border border-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {documents.map((doc) => (
            <div key={doc.title} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <doc.icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{doc.title}</h3>
                  <p className="text-xs text-gray-400">{doc.context}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-1 font-medium">{doc.subtitle}</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">{doc.description}</p>
              <a
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 text-primary-600 text-xs font-medium hover:bg-primary-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
