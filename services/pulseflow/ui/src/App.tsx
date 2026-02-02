import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import DataExplorer from './pages/DataExplorer'
import Training from './pages/Training'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/data" element={<DataExplorer />} />
        <Route path="/train" element={<Training />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
