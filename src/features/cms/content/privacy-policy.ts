import type { PolicyDocument } from "../types/core";

/**
 * The privacy policy as the site said it before it was editable. Section text uses the small
 * format described in `components/marketing/patterns/rich-text.tsx`.
 */
export const privacyPolicy: PolicyDocument = {
  eyebrow: "Privacy",
  heading: "Privacy policy",
  intro:
    "How Cafton collects, uses, and protects your personal information, and how this website uses cookies.",
  lastUpdated: "9 October 2026",
  sections: [
    {
      id: "",
      title: "Who we are",
      body: "This website is run by Cafton Software Development Services (“Cafton”), based in {{city}}, {{country}}. We are the personal information controller for the information described here, and we process it in line with the Data Privacy Act of 2012 (Republic Act No. 10173). You can reach us at [{{email}}](mailto:{{email}}).",
    },
    {
      id: "",
      title: "Information we collect",
      body: "**What you give us.** When you use the contact form we collect your name, email address, and phone number, and whatever you choose to tell us about your project: what it is for, your business and role, its size and how long it has operated, your office address if you give one, the challenges and systems you are interested in, your budget and timeline, how you heard about us, and any notes. If you email us, we keep that correspondence.\n\n**What is collected automatically.** Our hosting and security providers process technical data, such as your IP address and browser details, to deliver the site and protect it. The contact form also uses your IP address, briefly and in memory, to limit abuse, and shares it with Cloudflare for its bot check. We do not run analytics or advertising trackers.",
    },
    {
      id: "",
      title: "How we use it",
      body: "We use your inquiry to reply to you, discuss and scope possible work, and keep reasonable records of our business dealings. We use technical data to keep the site secure and working. We do not sell your personal information or use it for advertising.\n\nWe rely on your consent, which you give by submitting the form, and on our legitimate interest in running and securing this website.",
    },
    {
      id: "",
      title: "Who we share it with",
      body: "- **Our database provider**, which stores contact form submissions and our customer records for us.\n- **Cloudflare**, which provides the Turnstile bot check on the contact form.\n- **Our hosting provider**, which serves the website.\n- **Gleam**, only if you choose to load a giveaway entry form. Gleam then collects what you enter on its own terms.\n\nSome of these providers process data outside the Philippines. We only use providers that we trust to protect it, and we share nothing beyond what each needs to do its job.",
    },
    {
      id: "cookies",
      title: "Cookies and similar technologies",
      body: "Cookies are small files a site stores in your browser. We keep them to the minimum. Strictly necessary items work without your consent; anything optional stays off until you allow it. You can change your choice at any time: {{cookie-settings}}.\n\n{{cookie-table}}\n\nWe do not use analytics, advertising, or cross-site tracking cookies. Most browsers also let you block or delete cookies in their settings, though parts of a site may then stop working.",
    },
    {
      id: "",
      title: "How long we keep it",
      body: "We keep inquiry details for as long as we need them to respond and to keep reasonable business records, then delete or anonymize them. You can ask us to delete your information sooner at any time.",
    },
    {
      id: "",
      title: "How we protect it",
      body: "The site is served over HTTPS, the contact form is protected against spam and bots, and access to what you send us is limited to the people who need it to respond. No system is perfectly secure, so please do not send us sensitive information, such as government ID numbers or passwords, through the form.",
    },
    {
      id: "",
      title: "Your rights",
      body: "Under the Data Privacy Act of 2012 you have the right to:\n\n- Be informed about how your personal data is processed.\n- Access the personal data we hold about you.\n- Correct data that is inaccurate or out of date.\n- Object to processing, or ask us to suspend, remove, or block your data.\n- Receive your data in a structured, commonly used format.\n- Withdraw consent you have given, at any time.\n- Be compensated for damages from inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of your data.\n\nTo use any of these, email [{{email}}](mailto:{{email}}). If you believe your data has been mishandled you may also complain to the [National Privacy Commission](https://privacy.gov.ph).",
    },
    {
      id: "",
      title: "Changes to this policy",
      body: "If we change how we handle your information or which cookies we use, we will update this page and its date, and ask for your choice again if the cookies change. Questions about this policy can go to the address above, or you can [contact us](/contact).",
    },
  ],
};
