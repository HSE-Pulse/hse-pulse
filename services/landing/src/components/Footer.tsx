import { Github, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Harishankar Somasundaram | Dublin, Ireland
          </p>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/HSE-Pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors rounded-lg"
              aria-label="GitHub (opens in new tab)"
            >
              <Github className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href="https://www.linkedin.com/in/harishankar-somasundaram"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors rounded-lg"
              aria-label="LinkedIn (opens in new tab)"
            >
              <Linkedin className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-gray-500">
            MSc Artificial Intelligence | Dublin Business School, 2025-2026
          </p>
        </div>
      </div>
    </footer>
  )
}
