import { Mail, Phone, MapPin, Github, Linkedin, Send } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'harishankar.info@gmail.com',
    href: 'mailto:harishankar.info@gmail.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+353 899 775 093',
    href: 'tel:+353899775093',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Dublin, Ireland',
    href: null,
  },
]

const links = [
  {
    icon: Github,
    label: 'GitHub',
    value: 'github.com/HSE-Pulse',
    href: 'https://github.com/HSE-Pulse',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'linkedin.com/in/harishankar-somasundaram',
    href: 'https://www.linkedin.com/in/harishankar-somasundaram',
  },
]

export default function Contact() {
  return (
    <section id="contact" className="section-padding relative">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Contact"
          title="Get in Touch"
          description="Available for opportunities in AI/ML engineering, data science, and healthcare technology roles within Ireland and the EU."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Contact details */}
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-5">Contact Information</h3>
              <div className="space-y-4">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4.5 h-4.5 text-primary-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">{item.label}</div>
                      {item.href ? (
                        <a href={item.href} className="text-sm text-slate-300 hover:text-white transition-colors">
                          {item.value}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-300">{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-5">Professional Links</h3>
              <div className="space-y-3">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <link.icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    <div>
                      <div className="text-sm text-slate-300 group-hover:text-white transition-colors">{link.label}</div>
                      <div className="text-xs text-slate-500">{link.value}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Availability card */}
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Send className="w-5 h-5 text-primary-400" />
                <h3 className="text-sm font-semibold text-white">Availability</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm text-slate-300">Available for roles in Ireland / EU</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Work Authorisation</span>
                  <p className="text-sm text-slate-300 mt-1">
                    Stamp 1G visa — eligible to work full-time in Ireland without employer sponsorship.
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Current Status</span>
                  <p className="text-sm text-slate-300 mt-1">
                    Completing MSc in Artificial Intelligence at Dublin Business School (2025-2026).
                    Seeking ML engineering, data science, or healthcare AI positions.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Domain Expertise</h3>
              <div className="space-y-3">
                {[
                  { area: 'Healthcare AI', detail: 'Clinical NLP, vitals monitoring, treatment recommendation' },
                  { area: 'AIOps & MLOps', detail: 'Anomaly detection, infrastructure automation, model lifecycle' },
                  { area: 'LLM Engineering', detail: 'GPT, LLaMA, Falcon — fine-tuning, RAG, deployment' },
                  { area: 'Platform Engineering', detail: 'Microservices, Kubernetes, observability, CI/CD' },
                ].map((item) => (
                  <div key={item.area} className="p-3 rounded-xl bg-white/3">
                    <div className="text-sm font-medium text-white">{item.area}</div>
                    <div className="text-xs text-slate-500">{item.detail}</div>
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
