import SectionHeading from '../components/SectionHeading'
import { TrendingUp, Layers, FlaskConical, Shield } from 'lucide-react'

const pillars = [
  {
    icon: TrendingUp,
    title: 'Research to Production',
    text: 'Models that run reliably under real constraints — latency budgets, noisy data, and limited compute. Accuracy metrics matter, but so does everything around them.',
  },
  {
    icon: Layers,
    title: 'Systems Thinking',
    text: 'End-to-end ownership from data pipelines through model training to serving infrastructure. A model is only as strong as the system it runs in.',
  },
  {
    icon: FlaskConical,
    title: 'Applied Research',
    text: 'Bridging academic techniques and production requirements. Current focus: healthcare NLP, time-series forecasting, and LLM-augmented workflows.',
  },
  {
    icon: Shield,
    title: 'Reliability & Observability',
    text: 'Instrument everything. Design for graceful degradation. Health checks, structured logging, latency histograms, and experiment lineage are not optional.',
  },
]

export default function Summary() {
  return (
    <section id="summary" className="section-padding relative bg-slate-925/50">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Professional Summary"
          title="Building AI Systems That Work"
          description="From enterprise Java through data platforms to deep learning and LLM systems — a career built on making complex technology reliable and measurable."
        />

        <div className="max-w-4xl mx-auto mb-16">
          <div className="glass rounded-2xl p-8">
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                Over the past 11 years, I have progressed from backend engineering
                through distributed data systems to leading AI/ML teams delivering
                production models at scale. My work has spanned infrastructure
                automation with LLMs (GPT, LLaMA, Falcon), real-time anomaly
                detection for AIOps, and healthcare AI applications including
                clinical NLP and vital sign prediction.
              </p>
              <p>
                I led a team of data scientists at ABI-Health, building
                self-healing ML pipelines on Kubernetes and deploying
                LLM-powered automation that reduced operational incident
                resolution time. Earlier roles focused on distributed
                microservice architectures, search systems with Elasticsearch,
                and real-time data processing with Apache Spark and Kafka.
              </p>
              <p>
                I completed my MSc in Artificial Intelligence at Dublin Business
                School with First Class Honours, where my capstone project — the
                HSE-Pulse platform — demonstrated end-to-end integration of
                heterogeneous deep learning models into a single observable
                healthcare system. The projects below represent that body of work.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p) => (
            <div key={p.title} className="glass rounded-2xl p-6">
              <p.icon className="w-5 h-5 text-primary-400 mb-4" />
              <h3 className="text-sm font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
