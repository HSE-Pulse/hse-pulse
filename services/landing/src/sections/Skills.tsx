import { Brain, Code, Database, Cloud, Server } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const skillGroups = [
  {
    icon: Brain,
    label: 'AI & Machine Learning',
    skills: [
      'PyTorch',
      'TensorFlow',
      'Keras',
      'Scikit-learn',
      'LSTM / RNN',
      'BERT / Transformers',
      'LLMs (GPT, LLaMA, Falcon)',
      'Reinforcement Learning',
      'NLP',
      'Computer Vision',
      'Time Series Analysis',
    ],
  },
  {
    icon: Code,
    label: 'Languages & Frameworks',
    skills: [
      'Python',
      'Java',
      'TypeScript',
      'SQL',
      'Bash',
      'FastAPI',
      'Django',
      'Flask',
      'React',
      'Spring',
      'HuggingFace Transformers',
      'LangChain',
    ],
  },
  {
    icon: Database,
    label: 'Data Engineering',
    skills: [
      'Apache Kafka',
      'Apache Spark',
      'MongoDB',
      'PostgreSQL',
      'Elasticsearch',
      'Redis',
      'Neo4j',
      'FAISS',
      'ETL Pipelines',
    ],
  },
  {
    icon: Cloud,
    label: 'Cloud & MLOps',
    skills: [
      'AWS',
      'Azure',
      'GCP',
      'Docker',
      'Kubernetes',
      'Helm',
      'Terraform',
      'MLflow',
      'Prometheus',
      'Grafana',
      'MinIO',
    ],
  },
  {
    icon: Server,
    label: 'Architecture & DevOps',
    skills: [
      'Microservice Design',
      'REST / WebSocket APIs',
      'Nginx Reverse Proxy',
      'CI/CD (GitHub Actions, Jenkins, GitLab CI)',
      'Health Checks & Readiness Probes',
      'Structured Logging',
      'Observability',
    ],
  },
]

export default function Skills() {
  return (
    <section id="skills" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Technical Skills"
          title="Tools &amp; Technologies"
          description="Grouped by domain. These reflect tools I have used in production or research — not a wish list."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {skillGroups.map((group) => (
            <div key={group.label} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <group.icon className="w-4.5 h-4.5 text-primary-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  {group.label}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.skills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded text-xs text-slate-400 bg-white/5 border border-white/5"
                  >
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
