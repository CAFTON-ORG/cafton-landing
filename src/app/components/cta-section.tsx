"use client"

import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const smoothScrollTo = (targetId: string) => {
  document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function CTASection() {
  return (
    <section className='py-16 lg:py-24 bg-muted/80'>
      <div className='container mx-auto px-4 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <div className='text-center'>
            <div className='space-y-8'>
              {/* Badge */}
              <div className='flex flex-col items-center gap-4'>
                <Badge variant='outline' className='flex items-center gap-2'>
                  <Mail className='size-3' />
                  Get Started
                </Badge>
              </div>

              {/* Main Content */}
              <div className='space-y-6'>
                <h1 className='text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl'>
                  Ready to work with
                  <span className='flex sm:inline-flex justify-center'>
                    <span className='relative mx-2'>
                      <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
                        CAFTON
                      </span>
                      <div className='absolute start-0 -bottom-2 h-1 w-full bg-gradient-to-r from-primary/30 to-secondary/30' />
                    </span>
                    ?
                  </span>
                </h1>

                <p className='text-muted-foreground mx-auto max-w-2xl text-balance lg:text-xl'>
                  Let&apos;s talk about how we can help your team move faster with software built around
                  your needs.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className='flex flex-col justify-center gap-4 sm:flex-row sm:gap-6'>
                <Button size='lg' className='cursor-pointer px-8 py-6 text-lg font-medium' onClick={() => smoothScrollTo('#contact')}>
                  <Mail className='me-2 size-5' />
                  Contact Us
                </Button>
                <Button variant='outline' size='lg' className='cursor-pointer px-8 py-6 text-lg font-medium group' onClick={() => smoothScrollTo('#features')}>
                  Explore Features
                  <ArrowRight className='ms-2 size-4 transition-transform group-hover:translate-x-1' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
