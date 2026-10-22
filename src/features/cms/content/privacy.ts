export const cookies = [
  {
    name: "cafton_consent",
    provider: "Cafton",
    purpose: "Remembers the cookie choice you made, so we don't ask again on every page.",
    duration: "6 months",
    type: "Strictly necessary",
  },
  {
    name: "cafton-theme",
    provider: "Cafton (browser local storage)",
    purpose: "Remembers your light or dark preference. It is only saved if you use the theme toggle.",
    duration: "Until you clear it",
    type: "Strictly necessary",
  },
  {
    name: "Cloudflare Turnstile",
    provider: "Cloudflare",
    purpose:
      "Checks that a person, not a bot, is sending the contact form. Cloudflare may use cookies or browser storage while it does.",
    duration: "As set by Cloudflare",
    type: "Strictly necessary",
  },
  {
    name: "Gleam entry form",
    provider: "Gleam",
    purpose:
      "The giveaway entry form on our events pages. It loads only if you allow embedded content, and Gleam sets its own cookies.",
    duration: "As set by Gleam",
    type: "Optional (your consent)",
  },
];

