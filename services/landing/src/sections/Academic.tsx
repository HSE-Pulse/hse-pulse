import { GraduationCap, Download, FileText, BookOpen } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const BASE = import.meta.env.BASE_URL

const documents = [
  {
    icon: BookOpen,
    title: 'MSc Thesis',
    subtitle: 'Integrated Deep Learning Microservices for Healthcare Intelligence',
    context: 'MSc Artificial Intelligence — Dublin Business School, 2025–2026',
    description:
      'Investigates how domain-specific deep learning models (LSTM, BERT, ClinicalBERT) can be integrated into a unified, observable microservice platform for healthcare applications. Uses a design-science methodology with evaluation against MIMIC-III and MIMIC-IV clinical datasets.',
    href: `${BASE}resume/HarishankarSomasundaram_Thesis.pdf`,
    available: false,
  },
  {
    icon: FileText,
    title: 'CV / Resume',
    subtitle: 'Harishankar Somasundaram — Senior AI & ML Engineer',
    context: 'Updated February 2026',
    description:
      'Professional CV covering 11+ years of experience in software engineering, data science, and AI/ML. Includes roles at ABI-Health, Sathyanarayana United, and Altisource Labs.',
    href: `${BASE}resume/HarishankarSomasundaram_Resume.pdf`,
    available: true,
  },
]

export default function Academic() {
  return (
    <section id="academic" className="section-padding relative bg-slate-925/50">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Academic Work"
          title="Research &amp; Documents"
          description="Academic outputs from my MSc in Artificial Intelligence and professional documents available for review."
        />

        {/* Degree summary */}
        <div className="glass rounded-2xl p-6 lg:p-8 mb-10 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                MSc Artificial Intelligence
              </h3>
              <p className="text-sm text-primary-400 mb-3">
                Dublin Business School — First Class Honours (1:1) — 2025–2026
              </p>
              <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
                <p>
                  <span className="text-slate-500 font-medium">Research question: </span>
                  How can heterogeneous deep learning models be composed into a
                  unified, production-grade platform for clinical healthcare
                  applications?
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Methodology: </span>
                  Design-science approach with three ML services (LSTM vital
                  sign prediction, BERT treatment recommendation, ClinicalBERT
                  document intelligence) evaluated against MIMIC-III and MIMIC-IV
                  clinical datasets.
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Key contribution: </span>
                  Demonstrates that heterogeneous deep learning models can be
                  deployed as independent microservices sharing a common MLOps
                  layer (experiment tracking, monitoring, artifact storage)
                  without sacrificing inference performance or observability.
                </p>
              </div>

              {/* Focus areas */}
              <div className="flex flex-wrap gap-2 mt-4">
                {['Healthcare AI', 'Deep Learning', 'MLOps', 'Microservices', 'Clinical NLP', 'Time Series'].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-md text-xs text-slate-400 bg-white/5 border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {documents.map((doc) => (
            <div key={doc.title} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <doc.icon className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
                  <p className="text-xs text-slate-500">{doc.context}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1 font-medium">{doc.subtitle}</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">{doc.description}</p>
              {doc.available ? (
                <a
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 text-xs font-medium hover:bg-primary-500/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-slate-500 text-xs font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  Available upon completion
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
