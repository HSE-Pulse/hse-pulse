import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Activity,
  Database,
  Users,
  Menu,
  X,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import type { NotesStats } from '../data/useNotesData'

interface LayoutProps {
  stats: NotesStats
  loading: boolean
}

export default function Layout({ stats, loading }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'RAG Search' },
    { to: '/notes', icon: FileText, label: 'Notes Browser' },
  ]

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard'
    if (location.pathname === '/search') return 'RAG Search Engine'
    if (location.pathname === '/notes') return 'Notes Browser'
    if (location.pathname.startsWith('/notes/')) return 'Note Detail'
    if (location.pathname.startsWith('/patients/')) return 'Patient Profile'
    return 'PulseNotes'
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">PulseNotes</h1>
              <p className="text-xs text-slate-500">Clinical NLP Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Stats footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              Dataset
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded animate-pulse-gentle w-3/4" />
                <div className="h-3 bg-slate-200 rounded animate-pulse-gentle w-1/2" />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Notes</span>
                  <span className="font-semibold text-slate-700">{stats.totalNotes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patients</span>
                  <span className="font-semibold text-slate-700">{stats.totalPatients.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admissions</span>
                  <span className="font-semibold text-slate-700">{stats.totalAdmissions.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{getPageTitle()}</h2>
                <p className="text-xs text-slate-500">MIMIC-IV Clinical Notes Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-clinical-50 border border-clinical-200">
                <div className="w-2 h-2 rounded-full bg-clinical-500 animate-pulse" />
                <span className="text-xs font-medium text-clinical-700">
                  {loading ? 'Loading...' : 'Data Ready'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200">
                <Users className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs font-medium text-primary-700">
                  {stats.totalPatients} Patients
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
