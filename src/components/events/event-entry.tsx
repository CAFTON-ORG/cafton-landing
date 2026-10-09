import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { FollowAlong } from "@/components/events/follow-along";
import { GleamWidget } from "@/components/events/gleam-widget";
import { formatEventDates } from "@/lib/events";
import type { CaftonEvent, EventStatus } from "@/types/content";

interface EventEntryProps {
  event: CaftonEvent;
  status: EventStatus;
}

/** The entry section: the live form while open, otherwise a plain message about when it opens or that it has closed. */
export function EventEntry({ event, status }: EventEntryProps) {
  return (
    <PageSection className="border-t">
      <PageShell id="enter" className="max-w-3xl scroll-mt-24">
        <Reveal>
          {status === "open" && event.campaignUrl && (
            <>
              <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Enter now</h2>
              <div className="mt-8">
                <GleamWidget campaignUrl={event.campaignUrl} title={event.title.toUpperCase()} />
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Entry form not loading?{" "}
                <a
                  href={event.campaignUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Open the giveaway on Gleam
                </a>
                .
              </p>
            </>
          )}

          {status === "upcoming" && (
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Entries open soon</h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                {formatEventDates(event)}. The entry form appears here once the giveaway opens.
              </p>
            </div>
          )}

          {status === "closed" && (
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {event.closedTitle ?? "This giveaway has closed"}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                {event.closedNote ??
                  "Thank you to everyone who joined. Follow our social channels for the winner announcement and the next event."}
              </p>
            </div>
          )}

          <FollowAlong />
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
