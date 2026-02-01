import PlatformHero from '../sections/PlatformHero'
import PlatformOverview from '../sections/PlatformOverview'
import Capabilities from '../sections/Capabilities'
import MLOps from '../sections/MLOps'
import ThesisSection from '../sections/ThesisSection'

export default function PlatformPage() {
  return (
    <>
      <PlatformHero />
      <PlatformOverview />
      <Capabilities />
      <MLOps />
      <ThesisSection />
    </>
  )
}
