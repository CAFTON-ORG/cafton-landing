import type { Metadata } from 'next'
import { LandingPageContent } from './landing-page-content'

export const metadata: Metadata = {
  title: 'CAFTON - Modern Software Solutions',
  description: 'CAFTON builds modern software solutions that help teams work smarter. Explore our platform, pricing, and get in touch with our team.',
  keywords: ['CAFTON', 'software company', 'saas', 'technology'],
  openGraph: {
    title: 'CAFTON - Modern Software Solutions',
    description: 'CAFTON builds modern software solutions that help teams work smarter.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CAFTON - Modern Software Solutions',
    description: 'CAFTON builds modern software solutions that help teams work smarter.',
  },
}

export default function LandingPage() {
  return <LandingPageContent />
}
