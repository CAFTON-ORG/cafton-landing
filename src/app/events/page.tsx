import type { Metadata } from "next";
import { Gift, Share2, Trophy } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GleamWidget } from "@/components/events/gleam-widget";

const GIVEAWAY_URL = "https://gleam.io/V6Dp2/cafton-merch-giveaway";

export const metadata: Metadata = {
  title: "Events - CAFTON",
  description:
    "Giveaways, merch drops, and community events from CAFTON. Join in and follow along on our socials.",
  alternates: { canonical: "/events" },
};

const steps = [
  {
    icon: Share2,
    title: "Follow our socials",
    description:
      "Complete the quick entry actions on our channels to earn entries.",
  },
  {
    icon: Gift,
    title: "Enter the giveaway",
    description:
      "Join through the entry form below. More actions mean more chances to win.",
  },
  {
    icon: Trophy,
    title: "Win CAFTON merch",
    description:
      "Winners are picked at random when the giveaway closes and announced on our socials.",
  },
];

export default function EventsPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">Events</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Giveaways and community events.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Join our merch giveaways and follow along on our socials for
                what&apos;s coming next.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell>
          <RevealGroup className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <RevealItem key={step.title}>
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-3">
                    <step.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">{step.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </PageSection>

      <PageSection className="border-t">
        <PageShell className="max-w-3xl">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold">Current giveaway</h2>
            <div id="giveaway" className="mt-6">
              <GleamWidget
                campaignUrl={GIVEAWAY_URL}
                title="CAFTON MERCH GIVEAWAY"
              />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Entry form not loading?{" "}
              <a
                href={GIVEAWAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Open the giveaway on Gleam
              </a>
              .
            </p>
          </Reveal>
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
