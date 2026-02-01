import { MapPin, Briefcase, GraduationCap } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const experience = [
  {
    role: 'Data Scientist Lead & Head of AI',
    company: 'Kaiburr',
    location: 'Bengaluru, India',
    period: 'May 2020 – Dec 2024',
    highlights: [
      'Led a team of 8 engineers delivering 15+ production models with 95% SLA success rate across AWS, Azure, and GCP.',
      'Built LLM-powered Terraform Engine (GPT-4, LLaMA-2-70B, Falcon-180B) automating 75+ DevOps tools — 40% faster deployment cycles, 35% cloud cost reduction.',
      'Designed Generic Autonomous ML Engine using multi-agent LLM orchestration processing 5,000+ daily telemetry data points, reducing incident resolution from 30-60 minutes.',
      'Deployed AIOps anomaly detection platform (LSTM, Autoencoders, Isolation Forest) processing 10M+ daily log events with SHAP/LIME explainability and 99.9% uptime.',
      'Mentored 12+ data scientists and ML engineers across model development, deployment, and production monitoring.',
    ],
  },
  {
    role: 'Lead Engineer',
    company: 'Sathyanarayana United Software',
    location: 'Chennai, India',
    period: 'Aug 2018 – Apr 2020',
    highlights: [
      'Architected Smart Recruitment Agent — microservices platform serving 500+ HR recruiters with 99.9% uptime and 15+ services.',
      'Implemented zero-downtime deployment with ELK stack monitoring and CI/CD pipeline reducing deployment from 4 hours to 15 minutes.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Altisource Labs',
    location: 'Bengaluru, India',
    period: 'Jan 2016 – Jun 2018',
    highlights: [
      'Built ESB Advance Metrics platform processing 10M+ daily log entries with Spark MLlib time-series forecasting (ARIMA, Prophet) on Apache Camel/JBoss Fuse.',
      'Developed enterprise data wrangling pipeline handling 100+ GB daily from 50+ sources, including TensorFlow OCR achieving 92% accuracy on 5,000+ monthly documents.',
      'Built NLP-driven search and mortgage prediction model achieving 88% accuracy.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Techaffinity',
    location: 'Chennai, India',
    period: 'Jan 2015 – Dec 2015',
    highlights: [
      'Developed HIPAA-compliant IDTF Patient Tracking system for 100+ suppliers with pulse oximetry Bluetooth integration and 10K+ monthly transactions.',
      'Built tour operator platform managing 1K+ packages and $2M+ annual transactions on Azure cloud.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Changepond Technologies',
    location: 'Chennai, India',
    period: 'May 2013 – Dec 2014',
    highlights: [
      'Built SOLO Order Management system with BizTalk integration processing 50K+ orders with 98% SLA compliance.',
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
                  <div className="text-xs text-slate-400">Arunai Engineering College, Anna University</div>
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
