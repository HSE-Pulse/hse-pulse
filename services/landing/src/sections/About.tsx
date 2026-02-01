import { MapPin, Briefcase, GraduationCap } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const experience = [
  {
    role: 'Data Scientist Lead',
    company: 'ABI-Health (AB Innovative)',
    location: 'Bengaluru, India',
    period: '2020 – 2024',
    highlights: [
      'Led a team building LLM-powered infrastructure automation (GPT, Falcon, LLaMA) that reduced incident resolution time.',
      'Designed and deployed an AIOps anomaly detection platform with explainable AI on Kubernetes.',
      'Built self-healing production ML pipelines with automated retraining, monitoring, and rollback.',
    ],
  },
  {
    role: 'Lead Engineer',
    company: 'Sathyanarayana United Software',
    location: 'Chennai, India',
    period: '2018 – 2020',
    highlights: [
      'Architected microservice systems with zero-downtime deployment strategies.',
      'Implemented ELK stack monitoring and service coordination across distributed systems.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Altisource Labs',
    location: 'Bengaluru, India',
    period: '2016 – 2018',
    highlights: [
      'Built data analytics and time-series forecasting pipelines using Spark MLlib.',
      'Developed deep learning OCR systems with TensorFlow for document processing.',
    ],
  },
]

export default function About() {
  return (
    <section id="about" className="section-padding relative bg-slate-925/50">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="About"
          title="Professional Profile"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Left column: philosophy + credentials */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bio card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-slate-300">Dublin, Ireland</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Briefcase className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-slate-300">Stamp 1G — Full-time work eligibility</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Based in Ireland on Stamp 1G with full-time work eligibility.
                Holds an MSc in Artificial Intelligence with First Class Honours (1:1).
                No sponsorship required during visa validity.
              </p>
            </div>

            {/* Engineering philosophy */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Engineering Philosophy</h3>
              <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                <p>
                  Build systems that work under real constraints. Favour measured
                  simplicity over speculative complexity. A well-instrumented
                  simple model outperforms an unmonitored complex one.
                </p>
                <p>
                  Models are only as valuable as the systems they run in.
                  Inference latency, data quality, monitoring, and graceful
                  degradation matter as much as accuracy metrics.
                </p>
                <p>
                  Clear documentation, reproducible experiments, and honest
                  evaluation are non-negotiable. Technical decisions should be
                  traceable and reversible.
                </p>
              </div>
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
                  <div className="text-xs text-primary-400">First Class Honours (1:1)</div>
                  <div className="text-xs text-slate-400">Dublin Business School, Dublin</div>
                  <div className="text-xs text-slate-500">2025 – 2026</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">BE Computer Science &amp; Engineering</div>
                  <div className="text-xs text-slate-400">Anna University, Tamil Nadu</div>
                  <div className="text-xs text-slate-500">2008 – 2012</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: experience */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-6">Professional Experience</h3>
              <div className="space-y-6">
                {experience.map((exp) => (
                  <div key={exp.company} className="relative pl-5 border-l border-slate-700">
                    <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-primary-500 -translate-x-[4.5px]" />
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                      <h4 className="text-sm font-semibold text-white">{exp.role}</h4>
                      <span className="text-xs text-slate-500">{exp.period}</span>
                    </div>
                    <div className="text-xs text-primary-400 mb-2">
                      {exp.company} — {exp.location}
                    </div>
                    <ul className="space-y-1.5">
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
          </div>
        </div>
      </div>
    </section>
  )
}
