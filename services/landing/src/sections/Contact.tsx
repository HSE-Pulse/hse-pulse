import { Mail, MapPin, Phone, Github, Linkedin, Download } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const BASE = import.meta.env.BASE_URL

export default function Contact() {
  return (
    <section id="contact" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Contact"
          title="Availability &amp; Contact"
          description="Open to AI leadership and principal engineering roles in Ireland. Available for applied research and platform teams."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Contact details */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-5">Get in Touch</h3>
            <div className="space-y-4">
              <a
                href="mailto:harishankar.info@gmail.com"
                className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                harishankar.info@gmail.com
              </a>
              <a
                href="tel:+353899775093"
                className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                +353 89 977 5093
              </a>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0" />
                Dublin, Ireland
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-5">Professional Links</h3>
            <div className="space-y-4">
              <a
                href="https://github.com/harishankarsomasundaram"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4 text-slate-400 flex-shrink-0" />
                github.com/harishankarsomasundaram
              </a>
              <a
                href="https://www.linkedin.com/in/harishankar-somasundaram"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <Linkedin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                LinkedIn Profile
              </a>
              <a
                href={`${BASE}resume/HarishankarSomasundaram_Resume.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                Download CV (PDF)
              </a>
            </div>
          </div>

          {/* Availability */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-5">Status</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-slate-300">Available for roles in Ireland / EU</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Work Authorisation</span>
                <p className="text-sm text-slate-400 mt-1">
                  Stamp 1G — eligible to work full-time in Ireland without
                  employer sponsorship during visa validity.
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Seeking</span>
                <p className="text-sm text-slate-400 mt-1">
                  AI/ML leadership, Head of AI, and principal engineering
                  positions in Ireland.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
