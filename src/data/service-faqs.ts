import type { FaqItem } from "@/types/content";

/** Questions people ask before starting, per service pillar slug. Answers stay general: scope decides specifics, so none promises a price or a date. */
export const serviceFaqs: Record<string, FaqItem[]> = {
  operations: [
    {
      question: "Can we start with just one system, like payroll or inventory?",
      answer:
        "Yes. Most clients begin with the area that costs them the most time, then add others later. The systems are designed to share the same data, so adding one does not mean starting over.",
    },
    {
      question: "What happens to the spreadsheets and records we already have?",
      answer:
        "We look at how your information is kept today and plan how it moves into the new system as part of scoping. How much can be brought over cleanly depends on the state of the existing records, and we tell you that up front.",
    },
    {
      question: "Will it work if we run several branches or warehouses?",
      answer:
        "Yes. Systems such as inventory and point of sale are built to cover more than one location, with each site seeing what it needs. We confirm the exact setup when we scope your project.",
    },
    {
      question: "How does our team learn to use it?",
      answer:
        "We walk your team through the system at launch and stay involved afterwards for fixes and adjustments, because the real improvements show up once people use it day to day.",
    },
  ],
  growth: [
    {
      question: "Do we need a big audience before a growth system makes sense?",
      answer:
        "No. A simple way to capture inquiries and follow up on them reliably helps a small business as much as a large one. We size the system to the volume you have now and leave room to grow.",
    },
    {
      question: "Can it connect to the tools we already use for email or messaging?",
      answer:
        "Often, yes. We check what you use today during scoping and tell you which connections are practical and which would be better handled another way.",
    },
    {
      question: "How will we know it is working?",
      answer:
        "We set up reporting around the numbers that matter to you, such as inquiries received, follow-ups made, and bookings kept, so progress is something you can see rather than guess.",
    },
    {
      question: "Can customers book appointments on their own?",
      answer:
        "Yes. Booking can be part of the system, with availability you control and reminders so fewer slots go unused. How it looks and what it asks customers is shaped around your business.",
    },
  ],
  "industry-platforms": [
    {
      question: "Why build an industry platform instead of using off-the-shelf software?",
      answer:
        "Off-the-shelf tools are made for the average business. If your industry has its own way of working, a platform built around it removes the workarounds your team has learned to live with.",
    },
    {
      question: "Our industry is not listed. Can you still help?",
      answer:
        "Probably. The listed industries are the ones we have worked in most, but the approach is the same anywhere: learn how the work actually flows, then build around it. Tell us about your industry and we will say honestly whether we are a fit.",
    },
    {
      question: "Can organizations like schools or government units work with you?",
      answer:
        "Yes. We have built for schools, community organizations, and public-facing programs, not only for private businesses. The contact form asks what kind of organization you are so we can start the conversation in the right place.",
    },
    {
      question: "How long does a platform like this take?",
      answer:
        "It depends on scope, and we do not quote a number before understanding the problem. We usually propose a first release that covers the most important workflow, then build outward from it.",
    },
  ],
  "product-builds": [
    {
      question: "We only have an idea so far. Is that enough to start?",
      answer:
        "Yes. Many products begin as a sketch or a sentence. We help you work out who it is for and what the first version should do, which is usually smaller than people expect.",
    },
    {
      question: "Who owns the product once it is built?",
      answer:
        "Ownership and the terms around it are agreed in writing before work begins, so there is no ambiguity later. Ask us about it during your first conversation and we will walk through how it works.",
    },
    {
      question: "Can you improve a system we already have instead of building a new one?",
      answer:
        "Yes. System modernization is part of this service: we review what you have, then update or replace the parts holding you back without throwing away what works.",
    },
    {
      question: "Do you build both mobile apps and web apps?",
      answer:
        "Yes. We build mobile apps, web applications, and SaaS products, and we help you decide which one the first release should be rather than assuming you need all three.",
    },
  ],
};
