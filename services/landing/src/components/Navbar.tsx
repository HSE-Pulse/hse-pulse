import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Menu, X, Download, Activity } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

const portfolioLinks = [
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]

const platformLinks = [
  { label: 'Architecture', href: '#platform' },
  { label: 'Services', href: '#capabilities' },
  { label: 'MLOps', href: '#mlops' },
  { label: 'Research', href: '#thesis' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isPlatform = location.pathname.startsWith('/platform')
  const links = isPlatform ? platformLinks : portfolioLinks

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {isPlatform ? (
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                <Activity className="w-4.5 h-4.5 text-gray-900" />
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">HSE-Pulse</span>
            </Link>
          ) : (
            <a href="#" className="flex items-center gap-2.5 group">
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                H<span className="gradient-text">S</span>
              </span>
            </a>
          )}

          <div className="hidden md:flex items-center gap-1">
            {isPlatform ? (
              <Link to="/" className="px-3.5 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg hover:bg-white">
                Portfolio
              </Link>
            ) : (
              <>
                <Link to="/platform" className="px-3.5 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg hover:bg-white">
                  HSE-Pulse Platform
                </Link>
                <a href="/hse-pulse" className="px-3.5 py-2 text-sm text-cyan-600 hover:text-cyan-700 transition-colors rounded-lg hover:bg-white">
                  Agentic AI
                </a>
              </>
            )}

            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-white"
              >
                {link.label}
              </a>
            ))}

            {!isPlatform && (
              <a
                href={`${BASE}resume/HarishankarSomasundaram_CV.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg hover:bg-white"
              >
                <Download className="w-3.5 h-3.5" />
                CV
              </a>
            )}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200">
          <div className="px-6 py-4 space-y-1">
            {isPlatform ? (
              <Link to="/" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg hover:bg-white">
                Portfolio
              </Link>
            ) : (
              <>
                <Link to="/platform" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg hover:bg-white">
                  HSE-Pulse Platform
                </Link>
                <a href="/hse-pulse" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm text-cyan-600 hover:text-cyan-700 transition-colors rounded-lg hover:bg-white">
                  Agentic AI
                </a>
              </>
            )}

            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-white"
              >
                {link.label}
              </a>
            ))}

            {!isPlatform && (
              <a
                href={`${BASE}resume/HarishankarSomasundaram_CV.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm text-primary-600 hover:text-primary-700 transition-colors rounded-lg hover:bg-white"
              >
                Download CV
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
