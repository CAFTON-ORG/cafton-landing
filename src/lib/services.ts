import { Building2, Cog, Rocket, TrendingUp, type LucideIcon } from "lucide-react";

export interface ServiceSystem {
  title: string;
  description: string;
}

export interface ServicePillar {
  /** URL slug -- /services/[slug] */
  slug: string;
  icon: LucideIcon;
  title: string;
  /** Short line for cards/grids. */
  tagline: string;
  /** Longer paragraph for the detail page hero. */
  summary: string;
  systems: ServiceSystem[];
}

export const servicePillars: ServicePillar[] = [
  {
    slug: "operations",
    icon: Cog,
    title: "Operations Systems",
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
    icon: TrendingUp,
    title: "Growth Systems",
    tagline: "Turn interest into paying clients.",
    summary:
      "The systems that carry a lead from first contact to closed deal, then keep them coming back. For teams that are done chasing prospects through group chats and spreadsheets.",
    systems: [
      {
        title: "Lead Capture & Funnels",
        description:
          "Landing pages and forms that catch interest before it disappears.",
      },
      {
        title: "CRM & Pipeline",
        description:
          "One place to track every client, conversation, and deal stage.",
      },
      {
        title: "Appointments & Booking",
        description:
          "Scheduling that fills calendars without the back-and-forth messages.",
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
    icon: Building2,
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
    icon: Rocket,
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
        description:
          "Replace a system that's outgrown itself without losing the data it holds.",
      },
    ],
  },
];

export function getServicePillar(slug: string) {
  return servicePillars.find((pillar) => pillar.slug === slug);
}
