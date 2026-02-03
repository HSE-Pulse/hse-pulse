import SectionHeading from '../components/SectionHeading'
import { TrendingUp, Layers, FlaskConical, Shield } from 'lucide-react'

const pillars = [
  {
    icon: TrendingUp,
    title: '92.9% Wait Time Reduction',
    text: 'DES-MARL framework cut hospital wait times from 28.4h to 2h with 137% throughput improvement using Multi-Agent RL on MIMIC-IV clinical data.',
  },
  {
    icon: Layers,
    title: '10M+ Events Daily',
    text: 'AIOps platform processing 10M+ log events with 99.9% uptime. Kubernetes-native ML pipelines with auto-scaling and self-healing across AWS, Azure, GCP.',
  },
  {
    icon: FlaskConical,
    title: '40% Faster Deployments',
    text: 'LLM-powered Terraform Engine (GPT-4, LLaMA-2, Falcon-180B) automating 75+ DevOps tools with 35% cloud cost reduction.',
  },
  {
    icon: Shield,
    title: '15+ Production Models',
    text: '95% SLA success rate. SHAP/LIME explainability with 85% root cause accuracy. From deep learning OCR (92%) to NLP search engines.',
  },
]

export default function Summary() {
  return (
    <section id="summary" className="section-padding relative bg-slate-925/50">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Professional Summary"
          title="11 Years Building Production AI"
          description="From backend engineering to leading AI teams — delivering measurable impact at scale."
        />

        <div className="max-w-4xl mx-auto mb-16">
          <div className="glass rounded-2xl p-8">
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                <span className="text-white font-medium">Lead Data Scientist</span> with
                11 years progressing from distributed systems to AI/ML leadership.
                At Kaiburr, led 8 engineers shipping <span className="text-primary-400">15+ production models</span> with
                95% SLA success. Built LLM infrastructure automation
                (GPT-4, LLaMA-2, Falcon-180B) delivering <span className="text-primary-400">40% faster deployments</span> and
                <span className="text-primary-400"> 35% cost reduction</span>. Deployed AIOps platform
                processing <span className="text-primary-400">10M+ daily events</span> at 99.9% uptime.
              </p>
              <p>
                Architected Kubernetes/Istio microservices platform with ML-driven
                candidate matching serving 500+ recruiters. Built Spark MLlib forecasting
                pipelines, TensorFlow OCR systems (<span className="text-primary-400">92% accuracy</span>), and NLP search
                engines. Delivered across 9 enterprise clients in USA, UK, and Middle East.
              </p>
              <p>
                MSc research developed <span className="text-white font-medium">DES-MARL</span> — a novel
                Multi-Agent Reinforcement Learning framework for hospital optimisation
                achieving <span className="text-primary-400">92.9% wait time reduction</span> (28.4h → 2h)
                and <span className="text-primary-400">137% throughput improvement</span> using MADDPG/MAPPO
                on MIMIC-IV clinical data.
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
