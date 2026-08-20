"use client"

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const audiences = ['Businesses', 'Schools & Universities', 'Government & LGUs', 'Organizations & NGOs', 'Startups & Founders']

const FeaturedWork = () => {
  return (
    <section id="work" className="bg-muted/30 py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for real problems
          </h2>
          <p className="text-lg text-muted-foreground">
            Work that begins with a real need and ends with technology people can use.
          </p>
        </div>

        <article className="mx-auto max-w-4xl rounded-xl border bg-card p-7 sm:p-9"><p className="text-sm font-semibold uppercase tracking-widest text-primary">iLigtas</p><h3 className="mt-3 text-2xl font-semibold">Disaster Preparedness & Emergency Response Platform</h3><p className="mt-4 max-w-2xl text-muted-foreground">A technology platform supporting preparedness and emergency response through mobile technology, geofencing, location-based services, and web-based administration.</p><div className="mt-6 flex flex-wrap gap-3 text-sm font-medium"><span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Regional Finalist — Philippine Startup Challenge 9, Cordillera</span><span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Finalist — Baguio Smart City Challenge</span></div><Button variant="link" className="mt-5 px-0" asChild><Link href="/work">View case study <ArrowRight className="ml-2 size-4" /></Link></Button></article>
        <div className="mt-14 text-center"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for organizations moving forward</h2><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{audiences.map(item => <div key={item} className="rounded-lg border bg-background p-4 text-sm font-medium">{item}</div>)}</div></div>
      </div>
    </section>
  )
}

export { FeaturedWork }
