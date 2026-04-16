import { Mail, MapPin, Phone, Github, Linkedin, Download } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const BASE = import.meta.env.BASE_URL

export default function Contact() {
  return (
    <section id="contact" className="section-padding relative bg-gray-50/80">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Contact"
          title="Let's Talk"
          description="Open to Senior/Staff ML Engineer and AI Architect roles in Ireland."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Contact details */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Get in Touch</h3>
            <div className="space-y-4">
              <a
                href="mailto:harishankar.info@gmail.com"
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Mail className="w-4 h-4 text-primary-600 flex-shrink-0" />
                harishankar.info@gmail.com
              </a>
              <a
                href="tel:+353899775093"
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Phone className="w-4 h-4 text-primary-600 flex-shrink-0" />
                +353 89 977 5093
              </a>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                Dublin, Ireland
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Links</h3>
            <div className="space-y-4">
              <a
                href="https://github.com/HSE-Pulse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Github className="w-4 h-4 text-gray-500 flex-shrink-0" />
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/harishankar-somasundaram"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Linkedin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                LinkedIn
              </a>
              <a
                href={`${BASE}resume/HarishankarSomasundaram_CV.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-primary-600 hover:text-primary-700 transition-colors"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                Download CV
              </a>
            </div>
          </div>

          {/* Availability */}
          <div className="glass rounded-2xl p-6 ring-1 ring-green-500/10">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Availability</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-green-600 font-medium">Available now</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider">Work Auth</span>
                <p className="text-sm text-gray-600 mt-1">
                  Stamp 1G | No sponsorship needed
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider">Seeking</span>
                <p className="text-sm text-gray-500 mt-1">
                  Senior/Staff ML Engineer or AI Architect in Ireland
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
