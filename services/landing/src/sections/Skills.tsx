import { Brain, Sparkles, Cloud, Database, Code, Wrench } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const skillGroups = [
  {
    icon: Sparkles,
    label: 'GenAI & LLMs',
    priority: true,
    skills: [
      'GPT-4o', 'LLaMA-2', 'Falcon-180B',
      'LangGraph', 'LangChain',
      'RAG Pipelines', 'FAISS / Vector DBs',
      'Agentic Workflows', 'Prompt Engineering',
      'LLM Fine-tuning', 'LLM Evaluation',
      'Guardrails', 'Tool Orchestration',
    ],
  },
  {
    icon: Brain,
    label: 'ML & Deep Learning',
    priority: true,
    skills: [
      'PyTorch', 'TensorFlow', 'Scikit-learn',
      'BERT / ClinicalBERT', 'MADDPG / MAPPO',
      'Reinforcement Learning', 'NLP',
      'LSTM / RNN', 'Time Series',
      'Anomaly Detection', 'SHAP / LIME',
    ],
  },
  {
    icon: Cloud,
    label: 'MLOps & Cloud',
    priority: true,
    skills: [
      'Kubernetes', 'Docker', 'Helm',
      'GCP', 'AWS', 'Azure',
      'MLflow', 'Prometheus', 'Grafana',
      'Terraform', 'CI/CD (GitHub Actions, Jenkins)',
      'Nginx', 'Health Checks / Probes',
    ],
  },
  {
    icon: Database,
    label: 'Data Engineering',
    priority: false,
    skills: [
      'MongoDB', 'PostgreSQL', 'Elasticsearch',
      'Apache Kafka', 'Apache Spark',
      'Redis', 'FAISS / Vector DBs',
      'ETL Pipelines',
    ],
  },
  {
    icon: Code,
    label: 'Languages',
    priority: false,
    skills: [
      'Python', 'Java', 'TypeScript',
      'SQL', 'Scala', 'Bash',
    ],
  },
  {
    icon: Wrench,
    label: 'Frameworks',
    priority: false,
    skills: [
      'FastAPI', 'React', 'HuggingFace Transformers',
      'Flask', 'Django', 'Spring Boot',
    ],
  },
]

export default function Skills() {
  return (
    <section id="skills" className="section-padding relative bg-gray-50/80">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Technical Skills"
          title="Tools I Use in Production"
          description="Grouped by domain. These reflect tools used in production deployments and research, not a wish list."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {skillGroups.map((group) => (
            <div
              key={group.label}
              className={`glass rounded-2xl p-6 ${group.priority ? 'sm:col-span-1 lg:col-span-1 ring-1 ring-primary-500/10' : ''}`}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <group.icon className="w-4.5 h-4.5 text-primary-600" />
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  {group.label}
                </h3>
                {group.priority && (
                  <span className="ml-auto px-2 py-0.5 rounded text-xs text-primary-600 bg-primary-500/10">
                    Core
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded text-xs text-gray-500 bg-white border border-gray-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
