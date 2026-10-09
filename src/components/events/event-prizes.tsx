import Image from "next/image";
import { Award } from "lucide-react";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import type { EventPrize } from "@/types/content";

/** A prize's picture: its photo, or an award plate when there isn't one. Cut-outs sit on a light studio backdrop. */
function PrizePlate({ prize }: { prize: EventPrize }) {
  return (
    <div
      className={cn(
        "relative aspect-4/3 overflow-hidden rounded-xl",
        prize.image && !prize.cutout ? "bg-black" : "bg-linear-to-b from-zinc-200 to-zinc-400",
      )}
    >
      {prize.image ? (
        <Image
          src={prize.image}
          alt={prize.imageAlt ?? ""}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className={prize.cutout ? "object-contain p-8" : "object-cover"}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-800">
          <Award className="size-14" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600">
            {prize.items.join(" and ")}
          </span>
        </div>
      )}
    </div>
  );
}

interface EventPrizesProps {
  prizes: EventPrize[];
  heading?: string;
  /** Adds a divider above, when another section sits directly before. */
  divided?: boolean;
}

export function EventPrizes({ prizes, heading = "What you can win", divided }: EventPrizesProps) {
  return (
    <PageSection className={divided ? "border-t" : undefined}>
      <PageShell id="prizes" className="scroll-mt-24">
        <Reveal className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
        </Reveal>

        <ol>
          {prizes.map((prize, index) => (
            <li key={prize.name}>
              <Reveal className="grid items-center gap-6 border-b py-10 first:border-t lg:grid-cols-[6rem_1fr_1.1fr] lg:gap-10">
                <span
                  aria-hidden="true"
                  className="text-6xl font-black leading-none text-transparent [-webkit-text-stroke:1.5px_var(--foreground)] lg:text-7xl"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {prize.rank}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{prize.name}</h3>
                  <p className="mt-3 text-muted-foreground">{prize.items.join("  +  ")}</p>
                </div>
                <PrizePlate prize={prize} />
              </Reveal>
            </li>
          ))}
        </ol>
      </PageShell>
    </PageSection>
  );
}
