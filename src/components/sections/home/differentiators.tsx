"use client"

import { Card, CardContent } from '@/components/ui/card'
import { CardDecorator } from '@/components/ui/card-decorator'
import { Search, Layers3, Users } from 'lucide-react'

const values = [
  {
    icon: Search,
    title: 'Problem First',
    description: 'We understand the workflow before deciding on the technology.'
  },
  {
    icon: Layers3,
    title: 'End-to-End',
    description: 'We work across architecture, backend, database, web, mobile, APIs, and deployment.'
  },
  {
    icon: Users,
    title: 'Built Together',
    description: 'Three founders with years of experience working together—not a disconnected team assembled for a project.'
  }
]

export function Differentiators() {
  return (
    <section id="about" className="py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Not just another development team
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Software development is easy to describe. Understanding what software should actually be built is harder.
          </p>
        </div>

        {/* Values Grid */}
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-3">
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
