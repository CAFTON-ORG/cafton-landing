export type EventStatus = "upcoming" | "open" | "closed";

export interface EventPrize {
  rank: string;
  name: string;
  items: string[];
  /** Items without a photo render a typographic plate instead. */
  image?: string;
  imageAlt?: string;
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
  campaignUrl?: string;
  /** ISO timestamps. Leave out whichever is not announced yet. */
  startsAt?: string;
  endsAt?: string;
  /** Force-close an event regardless of its dates. */
  closed?: boolean;
  /** Without a poster image, one is composed from the event's prize photos. */
  poster?: { src: string; alt: string; width: number; height: number };
  /** Longer description paragraphs, shown as "About the event". */
  about?: string[];
  /** Heading above the prize rows. */
  prizesHeading?: string;
  prizes: EventPrize[];
  steps?: EventStep[];
  /** Replaces the default When / Prizes / Enter facts. */
  facts?: [label: string, value: string][];
  closedTitle?: string;
  closedNote?: string;
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
  {
    slug: "mr-and-ms-cafton-choice-award",
    title: "Mr. and Ms. Cafton's Choice Award",
    type: "Sponsorship",
    tagline: "Cafton stood behind the vote as a sponsor and technology partner.",
    summary:
      "Cafton sponsored the Mr. and Ms. Cafton's Choice Award and powered its voting with the Cafton Voting App. The winners have been chosen and received their awards and Cafton merch.",
    closed: true,
    about: [
      "The Mr. and Ms. Cafton's Choice Award recognises the pair chosen by vote. Cafton joined as one of its sponsors and partners, and built the Cafton Voting App that ran the voting.",
      "The event has now ended and the winners have been announced. Each took home a certificate, a sash and a Cafton merch package.",
    ],
    prizesHeading: "What the winners received",
    facts: [
      ["Role", "Sponsor and voting partner"],
      ["Voting by", "Cafton Voting App"],
      ["Winners", "Announced"],
    ],
    closedTitle: "This event has closed",
    closedNote:
      "The winners have been chosen. Thank you to everyone who took part. Follow our social channels for what comes next.",
    prizes: [
      {
        rank: "In the winner's package",
        name: "Certificate and sash",
        items: ["Certificate", "Sash"],
      },
      {
        rank: "In the winner's package",
        name: "Cafton notebook",
        items: ["Notebook"],
        image: "/events/mr-and-ms-cafton-choice-award/notebooks.jpg",
        imageAlt: "Two Cafton notebooks in black and grey on navy fabric",
      },
      {
        rank: "In the winner's package",
        name: "Cafton tumbler",
        items: ["Tumbler"],
        image: "/events/mr-and-ms-cafton-choice-award/tumblers.jpg",
        imageAlt: "Two black Cafton tumblers with the engraved logo",
      },
      {
        rank: "In the winner's package",
        name: "Cafton paper bag",
        items: ["Paper bag"],
        image: "/events/mr-and-ms-cafton-choice-award/paper-bags.jpg",
        imageAlt: "Three black Cafton paper gift bags",
      },
    ],
  },
];

export function getEventFacts(event: CaftonEvent): [string, string][] {
  if (event.facts) return event.facts;
  return [
    ["When", formatEventDates(event)],
    ["Prizes", `${event.prizes.length} winners`],
    ["Enter", "Online, through Gleam"],
  ];
}

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
  return event.closed ? "Completed" : "Dates to be announced";
}
