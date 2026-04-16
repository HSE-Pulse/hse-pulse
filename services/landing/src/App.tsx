import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PortfolioPage from './pages/PortfolioPage'
import PlatformPage from './pages/PlatformPage'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/platform" element={<PlatformPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
