import { MapPin, Briefcase, GraduationCap, Download, Code, Database, Cloud, Brain } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const skillGroups = [
  {
    icon: Brain,
    label: 'ML & AI',
    skills: ['PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'LLMs (GPT, LLaMA, Falcon)', 'NLP', 'Deep Learning', 'Time Series', 'Computer Vision'],
  },
  {
    icon: Code,
    label: 'Languages & Frameworks',
    skills: ['Python', 'Java', 'TypeScript', 'React', 'FastAPI', 'Django', 'Flask', 'Spring'],
  },
  {
    icon: Database,
    label: 'Data Engineering',
    skills: ['Apache Kafka', 'Apache Spark', 'MongoDB', 'Elasticsearch', 'Redis', 'Neo4j', 'ETL Pipelines'],
  },
  {
    icon: Cloud,
    label: 'Cloud & DevOps',
    skills: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI', 'Prometheus', 'Grafana'],
  },
]

const experience = [
  {
    role: 'Data Scientist Lead',
    company: 'ABI-Health (AB Innovative)',
    location: 'Bengaluru, India',
    period: '2020 - 2024',
    highlights: [
      'LLM-powered infrastructure automation (GPT, Falcon, LLaMA)',
      'AIOps anomaly detection platform with explainable AI',
      'Production ML on Kubernetes with self-healing pipelines',
    ],
  },
  {
    role: 'Lead Engineer',
    company: 'Sathyanarayana United Software',
    location: 'Chennai, India',
    period: '2018 - 2020',
    highlights: [
      'Microservice architecture with zero-downtime deployment',
      'ELK stack monitoring and service coordination',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Altisource Labs',
    location: 'Bengaluru, India',
    period: '2016 - 2018',
    highlights: [
      'Spark MLlib data analytics and time-series forecasting',
      'Deep learning OCR with TensorFlow',
    ],
  },
]

export default function About() {
  return (
    <section id="about" className="section-padding relative bg-slate-925/50">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="About"
          title="Harishankar Somasundaram"
          description="Data Scientist Lead with 11+ years of experience in machine learning, deep learning, data engineering, and enterprise software architecture."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: bio + education */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bio card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-slate-300">Dublin, Ireland</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Briefcase className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-slate-300">Stamp 1G — Eligible to work in Ireland</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Proven expertise in designing and deploying large language models for infrastructure
                automation and business process optimisation. Strong background in AIOps, anomaly detection,
                MLOps, and cloud platforms. Experienced in leading cross-functional teams and delivering
                production-ready AI solutions.
              </p>
            </div>

            {/* Education */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-primary-400" />
                <h3 className="text-sm font-semibold text-white">Education</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-white">MSc Artificial Intelligence</div>
                  <div className="text-xs text-slate-400">Dublin Business School, Dublin</div>
                  <div className="text-xs text-slate-500">2025 - 2026</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">BE Computer Science & Engineering</div>
                  <div className="text-xs text-slate-400">Anna University, Tamil Nadu</div>
                  <div className="text-xs text-slate-500">2008 - 2012</div>
                </div>
              </div>
            </div>

            {/* Resume download */}
            <a
              href="/resume/HarishankarSomasundaram_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 glass glass-hover rounded-2xl p-5 transition-all group"
            >
              <Download className="w-5 h-5 text-primary-400 group-hover:text-primary-300" />
              <div>
                <div className="text-sm font-semibold text-white">Download Resume</div>
                <div className="text-xs text-slate-500">PDF format</div>
              </div>
            </a>
          </div>

          {/* Right column: experience + skills */}
          <div className="lg:col-span-2 space-y-6">
            {/* Experience */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-5">Professional Experience</h3>
              <div className="space-y-6">
                {experience.map((exp) => (
                  <div key={exp.company} className="relative pl-5 border-l border-slate-700">
                    <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-primary-500 -translate-x-[4.5px]" />
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                      <h4 className="text-sm font-semibold text-white">{exp.role}</h4>
                      <span className="text-xs text-slate-500">{exp.period}</span>
                    </div>
                    <div className="text-xs text-primary-400 mb-2">{exp.company} — {exp.location}</div>
                    <ul className="space-y-1">
                      {exp.highlights.map((h) => (
                        <li key={h} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="text-slate-600 mt-1.5 flex-shrink-0">&#8226;</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {skillGroups.map((group) => (
                <div key={group.label} className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <group.icon className="w-4 h-4 text-primary-400" />
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{group.label}</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-xs text-slate-400 bg-white/5 border border-white/5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
