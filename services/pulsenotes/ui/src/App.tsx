import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NotesBrowser from './pages/NotesBrowser'
import NoteDetail from './pages/NoteDetail'
import PatientProfile from './pages/PatientProfile'
import SearchEngine from './pages/SearchEngine'
import { useNotesData } from './data/useNotesData'

export default function App() {
  const { notes, loading, error, stats } = useNotesData()

  return (
    <Routes>
      <Route element={<Layout stats={stats} loading={loading} />}>
        <Route index element={<Dashboard notes={notes} stats={stats} loading={loading} error={error} />} />
        <Route path="search" element={<SearchEngine />} />
        <Route path="notes" element={<NotesBrowser notes={notes} loading={loading} />} />
        <Route path="notes/:noteId" element={<NoteDetail notes={notes} />} />
        <Route path="patients/:patientId" element={<PatientProfile notes={notes} />} />
      </Route>
    </Routes>
  )
}
