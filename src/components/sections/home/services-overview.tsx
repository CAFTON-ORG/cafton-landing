"use client";

import { Cloud, Code2, MonitorSmartphone, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DotPattern } from "@/components/shared/dot-pattern";

const stats = [
  {
    icon: Code2,
    value: "Custom Software",
    description:
      "Purpose-built systems designed around your organization's workflows.",
  },
  {
    icon: MonitorSmartphone,
    value: "Web Applications",
    description:
      "Platforms, dashboards, portals, and business systems accessible from the web.",
  },
  {
    icon: Smartphone,
    value: "Mobile Applications",
    description:
      "Mobile experiences for customers, employees, field teams, and communities.",
  },
  {
    icon: Cloud,
    value: "SaaS & Digital Products",
    description:
      "Scalable software products designed to solve recurring problems.",
  },
];

export function ServicesOverview() {
  return (
    <section id="services" className="relative py-14 sm:py-16 lg:py-20">
      {/* Background with transparency */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-secondary/20" />
      <DotPattern className="opacity-75" size="md" fadeStyle="circle" />

      {/* Section Header */}
      <div className="relative mx-auto mb-10 max-w-4xl px-5 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          What we build
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Technology designed around real-world problems.
        </p>
      </div>

      <div className="container relative mx-auto px-5 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="text-center bg-background/60 backdrop-blur-sm border-border/50 py-0"
            >
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">
                    {stat.description}
                  </p>
                  <a href="/about#services" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Learn more →</a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
