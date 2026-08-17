"use client"

import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

type FaqItem = {
  value: string
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    value: 'item-1',
    question: 'What does CAFTON do?',
    answer:
      'CAFTON builds modern software solutions designed to help teams work more efficiently. Reach out to our team to learn more about how our platform can fit your specific needs.',
  },
  {
    value: 'item-2',
    question: 'How do I get started?',
    answer:
      'Getting started is easy, just reach out through our contact form and our team will walk you through onboarding, setup, and everything you need to get up and running.',
  },
  {
    value: 'item-3',
    question: 'What kind of support do you offer?',
    answer:
      'All plans include access to our support team. Professional and Enterprise plans include priority support with faster response times and a dedicated point of contact.',
  },
  {
    value: 'item-4',
    question: 'Is my data secure?',
    answer:
      'Yes. Security is built into everything we do, from how we store data to how we build our infrastructure. We follow industry best practices to keep your information safe.',
  },
  {
    value: 'item-5',
    question: 'How does pricing work?',
    answer:
      'We offer simple, transparent pricing that scales with your team. Check out our pricing section above for an overview, or contact our team for a custom quote.',
  },
  {
    value: 'item-6',
    question: 'Can I talk to someone before signing up?',
    answer:
      'Absolutely. Use the contact form below to reach our team and we\'ll be happy to answer any questions and help you find the right plan.',
  },
]

const FaqSection = () => {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about CAFTON. Still have questions? We&apos;re here to help!
          </p>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto">
          <div className='bg-transparent'>
            <div className='p-0'>
              <Accordion type='single' collapsible className='space-y-5'>
                {faqItems.map(item => (
                  <AccordionItem key={item.value} value={item.value} className='rounded-md !border bg-transparent'>
                    <AccordionTrigger className='cursor-pointer items-center gap-4 rounded-none bg-transparent py-2 ps-3 pe-4 hover:no-underline data-[state=open]:border-b'>
                      <div className='flex items-center gap-4'>
                        <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full'>
                          <CircleHelp className='size-5' />
                        </div>
                        <span className='text-start font-semibold'>{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='p-4 bg-transparent'>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Contact Support CTA */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Still have questions? We&apos;re here to help.
            </p>
            <Button className='cursor-pointer' asChild>
              <a href="#contact">
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { FaqSection }
