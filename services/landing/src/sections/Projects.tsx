import { Github, ExternalLink, Download } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import { config } from '../config'

interface Project {
  name: string
  tagline: string
  iconLetter: string
  iconBg: string
  colorText: string
  result: string
  approach: string
  stack: string[]
  github: string
  demo?: string
  reports?: { label: string; url: string }[]
}

const projects: Project[] = [
  {
    name: 'HSE Pulse Agent',
    tagline: 'Agentic AI Clinical Decision Support',
    iconLetter: 'A',
    iconBg: 'bg-cyan-500/10',
    colorText: 'text-cyan-600',
    result: 'Unified AI orchestrator across 5 ML services with multi-step tool chaining, clinical routing, and human-in-the-loop approval',
    approach: 'LangGraph agentic workflow with GPT-4o reasoning. Routes queries to PulseDiagAgent (diagnosis), PulseFlow (forecasting), CarePlanPlus (treatment), PulseNotes (RAG search), and MediSync (simulation). Integrated React dashboard.',
    stack: ['LangGraph', 'GPT-4o', 'FastAPI', 'React', 'Tailwind', 'Prometheus'],
    github: 'https://github.com/HSE-Pulse/pulsediagagent-studio',
    demo: config.HSE_PULSE_AGENT_URL,
  },
  {
    name: 'DES-MARL',
    tagline: 'Multi-Agent RL for Hospital Resource Optimisation',
    iconLetter: 'D',
    iconBg: 'bg-amber-500/10',
    colorText: 'text-amber-600',
    result: '92.9% wait time reduction (28.4h to 2h), 137% throughput improvement (306 to 727 patients/episode)',
    approach: '9 autonomous clinical department agents (MADDPG/MAPPO) with 5-stage curriculum learning on MIMIC-IV data. WebSocket real-time simulation.',
    stack: ['PyTorch', 'MADDPG/MAPPO', 'FastAPI', 'WebSocket', 'React', 'MIMIC-IV'],
    github: 'https://github.com/HSE-Pulse/medi-sync',
    demo: config.DESMARL_URL,
    reports: [
      { label: 'Thesis', url: '/reports/desmarl-applied-research.pdf' },
      { label: 'Paper', url: '/reports/desmarl-research-paper.pdf' },
    ],
  },
  {
    name: 'CarePlanPlus',
    tagline: 'BERT Treatment Pathway Recommendation',
    iconLetter: 'C',
    iconBg: 'bg-blue-500/10',
    colorText: 'text-blue-600',
    result: '96 procedure classes across 15 NIES categories, 125-200ms inference',
    approach: 'Fine-tuned BERT classifier on MIMIC-IV patient-admissions. Multi-step pathway generation with confidence scoring. 195K+ ICD code search.',
    stack: ['PyTorch', 'BERT', 'HuggingFace', 'FastAPI', 'MongoDB', 'React', 'MLflow'],
    github: 'https://github.com/HSE-Pulse/care-plan-plus',
    demo: config.CAREPLANPLUS_URL,
    reports: [{ label: 'Report', url: '/reports/careplanplus-report.pdf' }],
  },
  {
    name: 'PulseNotes',
    tagline: 'ClinicalBERT RAG Pipeline',
    iconLetter: 'P',
    iconBg: 'bg-purple-500/10',
    colorText: 'text-purple-600',
    result: 'Sub-200ms queries across 22,184 document chunks from 1,203 patients',
    approach: 'Bio_ClinicalBERT embeddings with FAISS vector indexing. Section-aware extraction across 13 clinical note sections. Query intent classification.',
    stack: ['ClinicalBERT', 'FAISS', 'MedLLaMA2', 'Ollama', 'FastAPI', 'MongoDB'],
    github: 'https://github.com/HSE-Pulse/pulse-notes',
    demo: config.PULSENOTES_URL,
    reports: [{ label: 'Report', url: '/reports/pulsenotes-report.pdf' }],
  },
  {
    name: 'PulseFlow',
    tagline: 'LSTM ED Trolley Forecasting',
    iconLetter: 'P',
    iconBg: 'bg-rose-500/10',
    colorText: 'text-rose-600',
    result: 'MAE ~6.9 trolleys, ~10ms inference, 1-14 day autoregressive forecasts',
    approach: '2-layer LSTM on HSE TrolleyGAR data across 12 Irish hospitals. 5-feature sliding window with confidence intervals. In-app training with MLflow.',
    stack: ['PyTorch', 'LSTM', 'FastAPI', 'MongoDB', 'React', 'Prometheus'],
    github: 'https://github.com/HSE-Pulse/pulse-flow',
    demo: config.PULSEFLOW_URL,
  },
]

const commercialHighlights = [
  {
    name: 'Cloudply AIOps Platform',
    client: 'Kaiburr LLC, MA, USA',
    period: '2020 - 2024',
    result: '40% faster deployments, 35% cost reduction, 10M+ daily events',
    description: 'LLM-powered Terraform Engine (GPT-4, LLaMA-2, Falcon-180B). 30+ microservices: anomaly detection, RCA, ML pipelines at 99.9% uptime.',
    stack: ['GPT-4', 'LLaMA-2', 'PyTorch', 'Kubernetes', 'Prometheus'],
  },
  {
    name: 'Smart Recruitment Agent',
    client: 'United Software Group, OH, USA',
    period: '2018 - 2020',
    result: '99.9% uptime, 500+ recruiters, 15+ services',
    description: 'ML-driven candidate matching on Kubernetes with Istio service mesh. NLP resume parsing. Zero-downtime deployment (4h to 15min).',
    stack: ['Java', 'Kubernetes', 'Istio', 'NLP', 'Elasticsearch'],
  },
  {
    name: 'ESB Advance Metrics',
    client: 'Ocwen Mortgage Services, FL, USA',
    period: '2016 - 2018',
    result: '10M+ daily log entries, 92% OCR accuracy, 88% prediction accuracy',
    description: 'Spark MLlib time-series forecasting (ARIMA, Prophet). TensorFlow OCR on 5,000+ monthly documents. NLP search engine. 100+ GB daily pipeline.',
    stack: ['Spark MLlib', 'TensorFlow', 'NLTK', 'Apache Camel', 'JBoss Fuse'],
  },
  {
    name: 'Patient Tracking System',
    client: 'Advanced Diagnostic Medical, USA',
    period: '2015',
    result: 'HIPAA-compliant, 10K+ monthly transactions',
    description: 'Medicare certified IDTF platform for home sleep apnea and overnight oximetry testing. Scheduling, billing, pulse oximetry Bluetooth integration.',
    stack: ['C#', '.NET', 'ASP.NET', 'SQL Server', 'Bluetooth SDK'],
  },
  {
    name: 'Tour Operator Platform',
    client: 'Afwaj Tours, Dubai',
    period: '2015',
    result: '1K+ packages, $2M+ annual transactions',
    description: 'Hajj and Umrah tour operator back office. Accommodation, transport, visa processing, payment handling, invoice generation.',
    stack: ['ASP.NET MVC', 'C#', 'Azure Cloud', 'WebAPI', 'jQuery'],
  },
  {
    name: 'SOLO Order Management',
    client: 'Carillion Telent, UK',
    period: '2013 - 2014',
    result: '50K+ orders, 98% SLA compliance',
    description: 'Work management system integrated with Openreach. Secure electronic order and notice transmission with role-based access for subcontractors.',
    stack: ['ASP.NET', 'BizTalk', 'C#', 'Azure Cloud', 'SQL Server'],
  },
]

export default function Projects() {
  return (
    <section id="projects" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Live Projects"
          title="5 ML Systems Running on This Domain"
          description="Healthcare AI built end-to-end: agentic orchestration, data pipelines, model training, API serving, React dashboards, MLflow tracking, Prometheus monitoring. All deployed on GKE."
        />

        {/* Live ML projects - first to match the section heading and give visitors immediate demos */}
        <div className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((p) => (
              <div key={p.name} className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                    <span className={`text-lg font-bold ${p.colorText}`}>{p.iconLetter}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.tagline}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Result</span>
                  <p className="text-sm text-primary-600 font-medium mt-0.5">{p.result}</p>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed mb-4">{p.approach}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.stack.map((tech) => (
                    <span key={tech} className="px-2 py-0.5 rounded text-xs text-gray-500 bg-white border border-gray-200">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <a href={p.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg">
                    <Github className="w-3.5 h-3.5" aria-hidden="true" /> Source <span className="sr-only">(opens in new tab)</span>
                  </a>
                  {p.demo && (
                    <a href={p.demo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg">
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Live Demo <span className="sr-only">(opens in new tab)</span>
                    </a>
                  )}
                  {p.reports?.map((r) => (
                    <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg">
                      <Download className="w-3.5 h-3.5" aria-hidden="true" /> {r.label} <span className="sr-only">(opens in new tab)</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commercial work - supporting context after the live demos */}
        <div>
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-white text-gray-500 border border-gray-200 mb-3">
              Commercial Experience
            </span>
            <h3 className="text-xl font-bold text-gray-900">Enterprise Delivery</h3>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto mt-2">
              Solutions delivered for clients across USA, UK, and Middle East spanning AI/ML, data engineering, and full-stack development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {commercialHighlights.map((p) => (
              <div key={p.name} className="glass rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{p.name}</h4>
                <div className="text-xs text-primary-600 mb-1">{p.client}</div>
                <div className="text-xs text-gray-500 mb-3">{p.period}</div>
                <div className="bg-gray-50 rounded-lg p-2 mb-3">
                  <p className="text-xs text-primary-600 font-medium">{p.result}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{p.description}</p>
                <div className="flex flex-wrap gap-1">
                  {p.stack.map((tech) => (
                    <span key={tech} className="px-2 py-0.5 rounded text-xs text-gray-500 bg-white border border-gray-200">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
