"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CardDecorator } from '@/components/ui/card-decorator'
import { Code, ShieldCheck, Layout, Sparkles } from 'lucide-react'

const values = [
  {
    icon: Code,
    title: 'Built Right',
    description: 'We write clean, maintainable software designed to last, not just to ship.'
  },
  {
    icon: ShieldCheck,
    title: 'Security First',
    description: 'Your data and your customers’ trust are treated as a top priority in everything we build.'
  },
  {
    icon: Layout,
    title: 'Reliable by Default',
    description: 'Battle-tested systems built for uptime, performance, and peace of mind.'
  },
  {
    icon: Sparkles,
    title: 'Thoughtful Design',
    description: 'Every detail is crafted with the end user in mind, from workflow to interface.'
  }
]

export function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            About CAFTON
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Built to help your business move faster
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            CAFTON is a software company focused on building dependable tools that solve real problems.
            Our mission is to help teams work smarter with software that gets out of the way and just works.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          {values.map((value, index) => (
            <Card key={index} className='group shadow-xs py-2'>
              <CardContent className='p-8'>
                <div className='flex flex-col items-center text-center'>
                  <CardDecorator>
                    <value.icon className='h-6 w-6' aria-hidden />
                  </CardDecorator>
                  <h3 className='mt-6 font-medium text-balance'>{value.title}</h3>
                  <p className='text-muted-foreground mt-3 text-sm'>{value.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
