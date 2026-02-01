import { Github, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Harishankar Somasundaram — Dublin, Ireland
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/HSE-Pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-400 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/harishankar-somasundaram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-400 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-slate-600">
            MSc Artificial Intelligence — Dublin Business School, 2025–2026
          </p>
        </div>
      </div>
    </footer>
  )
}
