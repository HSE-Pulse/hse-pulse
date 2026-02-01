import SectionHeading from '../components/SectionHeading'
import { TrendingUp, Layers, FlaskConical, Shield } from 'lucide-react'

const pillars = [
  {
    icon: TrendingUp,
    title: 'Research to Production',
    text: 'End-to-end ML systems from research through deployment. 15+ production models delivered with 95% SLA success rate across AWS, Azure, and GCP.',
  },
  {
    icon: Layers,
    title: 'Systems at Scale',
    text: 'Processing 10M+ daily log events, 5,000+ daily telemetry data points. Kubernetes-native ML pipelines with auto-scaling, self-healing, and 99.9% uptime.',
  },
  {
    icon: FlaskConical,
    title: 'Applied Research',
    text: 'Multi-Agent Reinforcement Learning for healthcare optimisation. LLM-powered infrastructure automation. Clinical NLP and time-series forecasting.',
  },
  {
    icon: Shield,
    title: 'Explainable AI',
    text: 'SHAP and LIME integration for model interpretability. 85% accuracy in anomaly root cause attribution. Audit trails and compliance-ready deployments.',
  },
]

export default function Summary() {
  return (
    <section id="summary" className="section-padding relative bg-slate-925/50">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Professional Summary"
          title="Building AI Systems That Deliver"
          description="From enterprise software through distributed data platforms to leading AI teams — a career built on measurable outcomes."
        />

        <div className="max-w-4xl mx-auto mb-16">
          <div className="glass rounded-2xl p-8">
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                Over the past 11 years, I have progressed from backend engineering
                through distributed data systems to leading AI/ML teams delivering
                production models at scale. As Data Scientist Lead and Head of AI
                at Kaiburr, I led a team of 8 engineers delivering 15+ production
                models, building LLM-powered infrastructure automation (GPT-4,
                LLaMA-2, Falcon-180B) that achieved 40% faster deployment cycles
                and 35% cloud cost reduction, and deploying an AIOps anomaly
                detection platform processing 10M+ log events daily with 99.9% uptime.
              </p>
              <p>
                Earlier roles included architecting a microservices recruitment
                platform serving 500+ HR recruiters with 99.9% uptime, building
                enterprise analytics processing 10M+ daily log entries with
                Spark MLlib time-series forecasting, and developing deep learning
                OCR systems achieving 92% accuracy on 5,000+ monthly documents.
              </p>
              <p>
                My MSc capstone research at Dublin Business School developed a
                novel DES-MARL framework integrating Discrete-Event Simulation
                with Multi-Agent Reinforcement Learning for hospital resource
                optimisation — achieving 92.9% wait time reduction and 137%
                throughput improvement using MADDPG on MIMIC-IV clinical data.
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
