"use client";

import { DotPattern } from "@/components/shared/dot-pattern";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Layers3, Users } from "lucide-react";

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
      "Three founders with years of experience working together—not a disconnected team assembled for a project.",
  },
];

export function Differentiators() {
  return (
    <section id="services" className="relative py-14 sm:py-16 lg:py-20">
      {/* Background with transparency */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-secondary/20" />
      <DotPattern className="opacity-75" size="md" fadeStyle="circle" />

      {/* Section Header */}
      <div className="mx-auto max-w-4xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          Not just another development team
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Software development is easy to describe. Understanding what software
          should actually be built is harder.
        </p>
      </div>

      <div className="container relative mx-auto px-5 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-3">
          {values.map((value, index) => (
            <Card
              key={index}
              className="text-center bg-background/60 backdrop-blur-sm border-border/50 py-0"
            >
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{value.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
