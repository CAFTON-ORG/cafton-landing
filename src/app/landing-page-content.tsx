import { LandingNavbar } from './components/navbar'
import { HeroSection } from './components/hero-section'
import { StatsSection } from './components/stats-section'
import { FeaturesSection } from './components/features-section'
import { AboutSection } from './components/about-section'
import { FaqSection } from './components/faq-section'
import { CTASection } from './components/cta-section'
import { ContactSection } from './components/contact-section'
import { LandingFooter } from './components/footer'

export function LandingPageContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <LandingNavbar />

      {/* Main Content */}
      <main>
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <FeaturesSection />
        <FaqSection />
        <CTASection />
        <ContactSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
