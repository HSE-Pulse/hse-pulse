import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Hero from './sections/Hero'
import PlatformOverview from './sections/PlatformOverview'
import Capabilities from './sections/Capabilities'
import MLOps from './sections/MLOps'
import ThesisSection from './sections/ThesisSection'
import About from './sections/About'
import Contact from './sections/Contact'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <PlatformOverview />
        <Capabilities />
        <MLOps />
        <ThesisSection />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
