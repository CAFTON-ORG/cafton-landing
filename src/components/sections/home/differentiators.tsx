"use client";

import { DotPattern } from "@/components/shared/dot-pattern";
import { Search, Layers3, Users } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const values = [
  {
    icon: Search,
    title: "Problem First",
    description:
      "We understand the workflow before deciding on the technology.",
  },
  {
    icon: Layers3,
    title: "End-to-End",
    description:
      "We work across architecture, backend, database, web, mobile, APIs, and deployment.",
  },
  {
    icon: Users,
    title: "Built Together",
    description:
      "Three founders with years of experience working together, not a disconnected team assembled for a project.",
  },
];

export function Differentiators() {
  const [lead, ...rest] = values;

  return (
    <section id="services" className="relative py-14 sm:py-16 lg:py-20">
      {/* Background with transparency */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-secondary/20" />
      <DotPattern className="opacity-75" size="md" fadeStyle="circle" />

      {/* Section Header */}
      <Reveal className="mx-auto max-w-4xl text-center mb-16 relative">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          Not just another development team
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Software development is easy to describe. Understanding what software
          should actually be built is harder.
        </p>
      </Reveal>

      <div className="container relative mx-auto px-5 sm:px-6 lg:px-8">
        <RevealGroup className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-2">
          <RevealItem className="flex flex-col gap-3 border-t border-border pt-6 sm:col-span-2 sm:flex-row sm:items-start sm:gap-6">
            <lead.icon className="size-6 shrink-0 text-foreground" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold text-foreground">{lead.title}</p>
              <p className="max-w-md text-muted-foreground">{lead.description}</p>
            </div>
          </RevealItem>
          {rest.map((value, index) => (
            <RevealItem
              key={index}
              className="flex flex-col gap-3 border-t border-border pt-6"
            >
              <value.icon className="size-5 text-foreground" aria-hidden="true" />
              <p className="font-semibold text-foreground">{value.title}</p>
              <p className="text-sm text-muted-foreground">
                {value.description}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
