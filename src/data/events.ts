import type { CaftonEvent } from "@/types/content";

export const events: CaftonEvent[] = [
  {
    slug: "cafton-merch-giveaway",
    authorId: "cafton",
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
    authorId: "cafton",
    title: "Mr. and Ms. Cafton's Choice Award",
    type: "Sponsorship",
    tagline: "Cafton stood behind the vote as a sponsor and technology partner.",
    summary:
      "Cafton sponsored the Mr. and Ms. Cafton's Choice Award and powered its voting with the Cafton Voting App. The winners have been chosen.",
    closed: true,
    poster: {
      src: "/events/mr-and-ms-cafton-choice-award/poster.jpg",
      alt: "Mr. and Ms. Cafton's Choice Award poster with the Cafton paper bag, notebook and tumblers",
      width: 1400,
      height: 1974,
    },
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
    promo: {
      eyebrow: "Built by Cafton",
      title: "The Cafton Voting App",
      description:
        "Secure, one-account-one-vote online elections. It ran the voting for this award. Want online voting for your own event or organization? Talk to us.",
      href: "https://mmsit.cafton.com",
      cta: "Visit mmsit.cafton.com",
    },
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
        image: "/events/mr-and-ms-cafton-choice-award/notebooks.webp",
        imageAlt: "Black and grey Cafton notebook with the logo on the cover",
        cutout: true,
      },
      {
        rank: "In the winner's package",
        name: "Cafton tumbler",
        items: ["Tumbler"],
        image: "/events/mr-and-ms-cafton-choice-award/tumblers.webp",
        imageAlt: "Two black Cafton tumblers with the engraved logo",
        cutout: true,
      },
    ],
  },
];
