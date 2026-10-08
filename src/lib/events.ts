export type EventStatus = "upcoming" | "open" | "closed";

export interface EventPrize {
  rank: string;
  name: string;
  items: string[];
  image: string;
  imageAlt: string;
}

export interface EventStep {
  title: string;
  description: string;
}

export interface CaftonEvent {
  slug: string;
  title: string;
  type: string;
  tagline: string;
  summary: string;
  /** Public Gleam campaign URL; the entry widget is built from it. */
  campaignUrl: string;
  /** ISO timestamps. Leave out whichever is not announced yet. */
  startsAt?: string;
  endsAt?: string;
  /** Force-close an event regardless of its dates. */
  closed?: boolean;
  poster: { src: string; alt: string; width: number; height: number };
  prizes: EventPrize[];
  steps: EventStep[];
}

export const events: CaftonEvent[] = [
  {
    slug: "cafton-merch-giveaway",
    title: "Cafton Merch Giveaway",
    type: "Giveaway",
    tagline: "Your chance to take home exclusive Cafton merch!",
    summary:
      "Scan, enter and win. Three winners take home exclusive Cafton merch, from a full gift set to a limited tote.",
    campaignUrl: "https://gleam.io/V6Dp2/cafton-merch-giveaway",
    poster: {
      src: "/events/cafton-merch-giveaway/poster.jpg",
      alt: "Cafton Merch Giveaway poster showing the three prizes and a QR code to enter",
      width: 1400,
      height: 1974,
    },
    prizes: [
      {
        rank: "Grand Winner",
        name: "The full Cafton set",
        items: ["Notebook", "Gift box", "Tumbler"],
        image: "/events/cafton-merch-giveaway/prize-grand.jpg",
        imageAlt: "Cafton notebook, branded gift box and black tumbler",
      },
      {
        rank: "2nd Winner",
        name: "Cafton notebook",
        items: ["Notebook"],
        image: "/events/cafton-merch-giveaway/prize-second.jpg",
        imageAlt: "Black and grey Cafton notebook",
      },
      {
        rank: "3rd Winner",
        name: "Cafton tote bag",
        items: ["Tote bag"],
        image: "/events/cafton-merch-giveaway/prize-third.jpg",
        imageAlt: "Cream Cafton canvas tote bag",
      },
    ],
    steps: [
      {
        title: "Scan",
        description:
          "Scan the QR code on the poster, or use the entry form on this page.",
      },
      {
        title: "Enter",
        description:
          "Complete the entry actions in the form. Each one earns you entries.",
      },
      {
        title: "Win",
        description:
          "Follow our social channels to catch the winner announcements.",
      },
    ],
  },
];

export function getEvent(slug: string): CaftonEvent | undefined {
  return events.find((event) => event.slug === slug);
}

export function getEventStatus(
  event: CaftonEvent,
  now: Date = new Date(),
): EventStatus {
  if (event.closed) return "closed";
  if (event.endsAt && now > new Date(event.endsAt)) return "closed";
  if (event.startsAt && now < new Date(event.startsAt)) return "upcoming";
  return "open";
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

export function formatEventDates(event: CaftonEvent): string {
  const { startsAt, endsAt } = event;
  if (startsAt && endsAt) {
    return `${dateFormat.format(new Date(startsAt))} to ${dateFormat.format(new Date(endsAt))}`;
  }
  if (endsAt) return `Ends ${dateFormat.format(new Date(endsAt))}`;
  if (startsAt) return `Starts ${dateFormat.format(new Date(startsAt))}`;
  return "Dates to be announced";
}
