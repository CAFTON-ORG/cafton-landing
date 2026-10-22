import type { LegalDocument } from "../types";

/** The legal page as the site said it before it was editable. See `privacy-policy.ts` for the text format. */
export const legal: LegalDocument = {
  eyebrow: "Legal",
  heading: "Legal Information",
  registrations: [
    {
      name: "DTI Business Name Registration",
      status: "Registered",
      detail: "BNN 8436511 · 21 Aug 2026",
      image: "",
      imageAlt: "",
    },
    {
      name: "BIR Certificate of Registration",
      status: "Registered",
      detail: "RSN 008RC20260000010999 · 2 Sep 2026",
      image: "/images/bir-badge-seal.jpg",
      imageAlt: "BIR Certificate of Registration seal",
    },
  ],
  sections: [
    {
      id: "",
      title: "Company Information",
      body: "Cafton Software Development Services is registered with the Department of Trade and Industry (DTI) under BNN 8436511 (registered 21 Aug 2026) and with the Bureau of Internal Revenue (BIR) (registered 2 Sep 2026).",
    },
    {
      id: "",
      title: "Business Registration",
      body: "Cafton holds the following registrations with the Philippine government.\n\n{{registrations}}",
    },
    {
      id: "",
      title: "Terms of Use",
      body: "By accessing or using this website, you agree to these terms. If you do not agree with any part of them, please do not use this site.",
    },
    {
      id: "",
      title: "Use of This Website",
      body: "This website and its contents are provided for general information about Cafton and its services. You may browse and share pages normally, but you may not copy, reproduce, or redistribute any part of this site for commercial purposes without our written permission.",
    },
    {
      id: "",
      title: "Intellectual Property",
      body: "The Cafton name, logo, and the content of this website are the property of Cafton Software Development Services unless stated otherwise. Portfolio work shown belongs to the respective clients and is featured with their permission.",
    },
    {
      id: "",
      title: "Limitation of Liability",
      body: "This website is provided as is, without warranties of any kind. To the fullest extent permitted by law, Cafton is not liable for any loss or damage arising from your use of this site.",
    },
    {
      id: "",
      title: "Governing Law",
      body: "These terms are governed by the laws of the Republic of the Philippines.",
    },
    {
      id: "",
      title: "Changes to These Terms",
      body: "We may update this page from time to time as our registration details or business practices change. Continued use of this website after an update means you accept the revised terms.",
    },
    {
      id: "",
      title: "Contact",
      body: "For questions about these terms, contact us at {{email}}.",
    },
  ],
};
