import type { ServiceContent } from "../types";

/** The service areas and the systems under each, as the site said before they were editable. */
export const serviceContent: ServiceContent[] = [
  {
    slug: "operations",
    title: "Business Operations Systems",
    tagline: "Run the back office without the busywork.",
    summary:
      "The systems that keep a business running day to day: people, money, sales at the counter, stock on the shelf, and product on the line. Built to replace spreadsheets and disconnected tools with one system your team actually uses.",
    systems: [
      {
        title: "HR, Attendance & Payroll",
        description:
          "Employee records, time and attendance, leave, and payroll computation in one place.",
      },
      {
        title: "Finance & Accounting",
        description:
          "Bookkeeping, invoicing, expense tracking, and financial reporting that stays current on its own.",
      },
      {
        title: "POS & Sales Terminals",
        description:
          "Process transactions, print receipts, and track daily revenue at the counter or on the floor.",
      },
      {
        title: "Inventory & Warehouse (WMS)",
        description:
          "Real-time stock levels, transfers, and warehouse operations across as many locations as you run.",
      },
      {
        title: "Production & Manufacturing",
        description:
          "Plan production runs, track output, and manage supply from raw material to finished goods.",
      },
    ],
  },
  {
    slug: "growth",
    title: "Growth Systems",
    tagline: "Turn interest into paying clients.",
    summary:
      "The systems that carry a lead from first contact to closed deal, then keep them coming back. Built for teams ready to move past tracking prospects across scattered messages and spreadsheets.",
    systems: [
      {
        title: "Lead Capture & Funnels",
        description: "Landing pages and forms that catch interest before it disappears.",
      },
      {
        title: "CRM & Pipeline",
        description: "One place to track every client, conversation, and deal stage.",
      },
      {
        title: "Appointments & Booking",
        description: "Scheduling that fills calendars without the back-and-forth messages.",
      },
      {
        title: "Marketing Automation",
        description:
          "Recurring campaigns and follow-ups that run without someone triggering each one by hand.",
      },
      {
        title: "Sales Analytics & Forecasting",
        description: "Know what's selling, what's stalling, and what's coming next.",
      },
    ],
  },
  {
    slug: "industry-platforms",
    title: "Industry Platforms",
    tagline: "Full systems built for the way your industry actually runs.",
    summary:
      "Not a generic template stretched to fit. Complete platforms shaped around how commerce, hospitality, construction, property, and education businesses actually operate, from the first customer touchpoint to the back-end record.",
    systems: [
      {
        title: "Commerce & Distribution",
        description:
          "Online stores, reseller and affiliate programs, franchise rollouts, and subscription products under one system.",
      },
      {
        title: "Food, Retail & Hospitality",
        description:
          "Restaurant floor-to-kitchen operations, cloud kitchens, delivery, and multi-branch retail management.",
      },
      {
        title: "Construction & Field Operations",
        description:
          "Project tracking, progress billing, and field crews coordinated from one dashboard.",
      },
      {
        title: "Property & Real Estate",
        description:
          "Listings, tenants, leases, and property portfolios managed without a spreadsheet in sight.",
      },
      {
        title: "Education & Training",
        description:
          "Enrollment, coursework, assessment, and certification for schools, review centers, and corporate teams.",
      },
    ],
  },
  {
    slug: "product-builds",
    title: "New Product Builds",
    tagline: "From a sketched idea to a shipped product.",
    summary:
      "For a product that doesn't exist yet, or a system that's outgrown the one it's running on. We build it from the ground up, or rebuild it properly this time.",
    systems: [
      {
        title: "Mobile App Development",
        description: "iOS and Android apps built for real usage, not just a demo.",
      },
      {
        title: "Web Application Development",
        description: "Secure, scalable platforms built around your actual workflow.",
      },
      {
        title: "SaaS Product Development",
        description: "Multi-tenant products designed for subscriptions and growth.",
      },
      {
        title: "System Modernization",
        description: "Replace a system that's outgrown itself without losing the data it holds.",
      },
    ],
  },
];;

/** The wording at the top of the Services page. */
export const servicesPage = {
  eyebrow: "Services",
  heading: "Software for the whole business, not just one corner of it.",
  intro:
    "Four areas we build in, each covering the systems that actually move a business forward. Pick the one closest to your problem and see what's inside.",
  detail: {
    navTagline: "Software for the whole business, not just one corner of it.",
    navLinkLabel: "View all services",
    talkLabel: "Talk to us about this",
    systemsEyebrow: "What's inside",
    systemsHeading: "{count} systems we build under this service.",
    systemsHint: "Start with one, or combine several. They are designed to share the same data.",
    faqEyebrow: "Questions",
    faqHeading: "Before you get in touch.",
    relatedHeading: "Related work",
  },
};
