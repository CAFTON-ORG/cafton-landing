"use client"

import {
  BarChart3,
  Zap,
  Users,
  ArrowRight,
  Database,
  ShieldCheck,
  Layout,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardDecorator } from '@/components/ui/card-decorator'
import { Card, CardContent } from '@/components/ui/card'

const mainFeatures = [
  {
    icon: Zap,
    title: 'Fast & Reliable',
    description: 'Performance-focused software that keeps your team moving without slowdowns.'
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Default',
    description: 'Security best practices baked in from the ground up, not bolted on.'
  },
  {
    icon: Layout,
    title: 'Easy to Use',
    description: 'Thoughtfully designed interfaces that your whole team can pick up quickly.'
  },
  {
    icon: BarChart3,
    title: 'Built to Scale',
    description: 'Infrastructure and architecture that grows alongside your business.'
  },
  {
    icon: Users,
    title: 'Built for Teams',
    description: 'Collaboration-friendly tools that keep everyone on the same page.'
  },
  {
    icon: Palette,
    title: 'Modern Experience',
    description: 'A clean, modern experience across every part of the product.'
  },
  {
    icon: Database,
    title: 'Your Data, Protected',
    description: 'Reliable data handling with your privacy and security in mind.'
  },
  {
    icon: ArrowRight,
    title: 'Always Improving',
    description: 'Regular updates and improvements based on real customer feedback.'
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Why CAFTON</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything you need in one platform
          </h2>
          <p className="text-lg text-muted-foreground">
            We build software that&apos;s fast, secure, and genuinely easy to use, so your team can focus
            on the work that matters.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 mb-12">
          {mainFeatures.map((feature, index) => (
            <Card key={index} className="group shadow-xs py-2">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <CardDecorator>
                    <feature.icon className="h-6 w-6" aria-hidden />
                  </CardDecorator>
                  <h3 className="mt-6 font-medium text-balance">{feature.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="cursor-pointer" asChild>
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault()
                document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              View Pricing
              <ArrowRight className="ms-2 size-4" aria-hidden="true" />
            </a>
          </Button>
          <Button size="lg" variant="outline" className="cursor-pointer" asChild>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault()
                document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              Contact Us
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
