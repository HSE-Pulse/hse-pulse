import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import Pathway from './pages/Pathway'
import DataExplorer from './pages/DataExplorer'
import NiesAnalytics from './pages/NiesAnalytics'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="predict" element={<Predict />} />
        <Route path="pathway" element={<Pathway />} />
        <Route path="data" element={<DataExplorer />} />
        <Route path="nies" element={<NiesAnalytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
