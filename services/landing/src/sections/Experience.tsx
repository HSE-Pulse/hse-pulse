import { GraduationCap, Briefcase, MapPin } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const roles = [
  {
    role: 'Lead Data Scientist',
    company: 'Kaiburr LLC',
    location: 'MA, USA (Remote)',
    period: 'May 2020 - Dec 2024',
    project: 'Cloudply - AIOps Platform',
    featured: true,
    highlights: [
      'Led 8 engineers delivering 15+ production models with 95% SLA success, 40% faster deployments, 35% cloud cost reduction across AWS, Azure, GCP',
      'Built LLM-powered Terraform Engine (GPT-4, LLaMA-2, Falcon-180B) with agentic orchestration, RAG retrieval, and prompt-chaining — automated 75+ DevOps toolchains, reducing IaC authoring time by 40% across 5,000+ daily telemetry events',
      'Architected AIOps platform with 30+ microservices: anomaly detection (LSTM, Autoencoders), root cause analysis, ML pipelines processing 10M+ daily events at 99.9% uptime with Prometheus/Grafana observability',
      'Built production RAG pipelines, vector store management, LLM-powered test generation, and code remediation workflows with guardrails — adopted across 3 enterprise client teams',
    ],
    stack: ['GPT-4', 'LLaMA-2', 'Falcon-180B', 'RAG', 'LangChain', 'PyTorch', 'LSTM', 'Vector DB', 'Kubernetes', 'Docker', 'Prometheus', 'Grafana'],
  },
  {
    role: 'Lead Engineer',
    company: 'Sathyanarayana United Software',
    location: 'Chennai, India',
    period: 'Aug 2018 - Apr 2020',
    project: 'Smart Recruitment Agent | Client: United Software Group, OH, USA',
    featured: true,
    highlights: [
      'Architected Smart Recruitment Agent on Kubernetes with Istio service mesh, serving 500+ HR recruiters with 99.9% uptime across 15+ services',
      'Implemented ML-driven candidate matching and resume parsing using NLP techniques for intelligent skill extraction and job-candidate scoring',
      'Implemented zero-downtime deployment with ELK stack monitoring and CI/CD pipeline reducing deployment from 4 hours to 15 minutes',
    ],
    stack: ['Java', 'Spring Boot', 'Kubernetes', 'Istio', 'Elasticsearch', 'Logstash', 'Kibana', 'Docker', 'Jenkins', 'NLP'],
  },
  {
    role: 'Software Engineer',
    company: 'Altisource Labs',
    location: 'Bengaluru, India',
    period: 'Jan 2016 - Jun 2018',
    project: 'ESB Advance Metrics & Data Wrangling | Client: Ocwen Mortgage Services, FL, USA',
    featured: false,
    highlights: [
      'Built ESB Advance Metrics platform processing 10M+ daily log entries with Spark MLlib time-series forecasting (ARIMA, Prophet) on Apache Camel/JBoss Fuse',
      'Developed enterprise data wrangling pipeline handling 100+ GB daily from 50+ sources, including TensorFlow OCR achieving 92% accuracy on 5,000+ monthly documents',
      'Built NLP-driven search engine using NLTK and OpenNLP, and mortgage prediction model achieving 88% accuracy',
    ],
    stack: ['Python', 'Java', 'Spark MLlib', 'TensorFlow', 'NLTK', 'OpenNLP', 'Apache Camel', 'JBoss Fuse', 'MongoDB', 'R'],
  },
  {
    role: 'Software Engineer',
    company: 'Techaffinity',
    location: 'Chennai, India',
    period: 'Jan 2015 - Dec 2015',
    project: 'Multiple Clients: IntelligIS, Advanced Diagnostic Medical, Afwaj Tours',
    featured: false,
    highlights: [
      'Developed HIPAA-compliant Patient Tracking system with pulse oximetry Bluetooth integration handling 10K+ monthly transactions',
      'Created tour operator platform managing 1K+ packages and $2M+ annual transactions on Azure cloud',
      'Built SPoT Provisioning Tool with Spring Framework for automated system provisioning with role-based access and audit logging',
    ],
    stack: ['C#', 'ASP.NET MVC', 'Java', 'Spring Boot', 'SQL Server', 'Azure', 'Bluetooth SDK', 'jQuery'],
  },
  {
    role: 'Software Engineer',
    company: 'Changepond Technologies',
    location: 'Chennai, India',
    period: 'May 2013 - Dec 2014',
    project: 'SOLO Order Management System | Client: Carillion Telent, UK',
    featured: false,
    highlights: [
      'Built SOLO Order Management system with BizTalk integration processing 50K+ orders with 98% SLA compliance',
      'Integrated with Openreach work notification system via secure interface for electronic order and notice transmission',
    ],
    stack: ['ASP.NET', 'C#', 'BizTalk', 'WebAPI', 'Azure Cloud', 'jQuery', 'SQL Server'],
  },
]

export default function Experience() {
  return (
    <section id="experience" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Background"
          title="Experience & Education"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Left: Education + Credentials */}
          <div className="lg:col-span-1 space-y-5">
            {/* Work auth */}
            <div className="glass rounded-2xl p-6 ring-1 ring-green-500/15">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <h3 className="text-sm font-semibold text-gray-900">Work Authorisation</h3>
              </div>
              <p className="text-sm text-green-600 font-medium mb-1">Stamp 1G</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Eligible to work full-time in Ireland without employer sponsorship.
                No visa processing required.
              </p>
            </div>

            {/* Education */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900">Education</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">MSc Artificial Intelligence</div>
                  <div className="text-xs text-primary-600 font-medium">First Class Honours (1:1)</div>
                  <div className="text-xs text-gray-500">Dublin Business School</div>
                  <div className="text-xs text-gray-500">2025 - 2026</div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Capstone: HSE-Pulse, 4 ML services across 17 containers.
                    Multi-Agent RL, BERT, ClinicalBERT RAG, LSTM forecasting.
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">BE Computer Science</div>
                  <div className="text-xs text-gray-500">Anna University, India</div>
                  <div className="text-xs text-gray-500">2008 - 2012</div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-gray-600">Dublin, Ireland</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Available for roles in Dublin, Cork, Galway, Limerick, or hybrid/remote across Ireland and the EU.
              </p>
            </div>
          </div>

          {/* Right: Experience timeline */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900">Professional Experience</h3>
                <span className="ml-auto text-xs text-gray-500">11+ years</span>
              </div>
              <div className="space-y-6">
                {roles.map((exp, idx) => (
                  <div
                    key={`${exp.company}-${idx}`}
                    className={`relative pl-5 border-l ${exp.featured ? 'border-primary-500/40' : 'border-gray-200'}`}
                  >
                    <div className={`absolute left-0 top-1 w-2 h-2 rounded-full -translate-x-[4.5px] ${exp.featured ? 'bg-primary-500' : 'bg-gray-400'}`} />
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">{exp.role}</h4>
                      <span className="text-xs text-gray-500">{exp.period}</span>
                    </div>
                    <div className="text-xs text-primary-600 mb-1">
                      {exp.company}, {exp.location}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {exp.project}
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {exp.highlights.map((h) => (
                        <li key={h} className="text-sm text-gray-500 flex items-start gap-2">
                          <span className="text-gray-500 mt-1.5 flex-shrink-0">&#8226;</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1">
                      {exp.stack.map((tech) => (
                        <span key={tech} className="px-1.5 py-0.5 rounded text-xs text-gray-500 bg-white border border-gray-200">
                          {tech}
                        </span>
                      ))}
                    </div>
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
