"use client"

import Image from 'next/image'
import { ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DotPattern } from '@/components/dot-pattern'
import caftonMark from '@/assets/cafton.png'

const smoothScrollTo = (targetId: string) => {
  const element = document.querySelector(targetId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-background to-background/80 pt-16 sm:pt-20 pb-24">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement Badge */}
          <div className="mb-8 flex justify-center">
            <Badge variant="outline" className="px-4 py-2 border-foreground">
              <Star className="w-3 h-3 mr-2 fill-current" />
              Welcome to CAFTON
              <ArrowRight className="w-3 h-3 ml-2" />
            </Badge>
          </div>

          {/* Main Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Software that
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}moves your business{" "}
            </span>
            forward
          </h1>

          {/* Subheading */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            CAFTON builds modern, reliable software that helps teams work smarter. We&apos;re here to
            help you get started with a solution built around your needs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="text-base cursor-pointer"
              onClick={() => smoothScrollTo('#contact')}
            >
              Get in Touch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base cursor-pointer"
              onClick={() => smoothScrollTo('#features')}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Brand Mark */}
        <div className="mx-auto mt-16 sm:mt-20 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 scale-90 rounded-full bg-primary/40 blur-3xl" />
            <div className="relative w-40 sm:w-52 md:w-60 overflow-hidden rounded-3xl border shadow-2xl">
              <Image
                src={caftonMark}
                alt="CAFTON"
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
