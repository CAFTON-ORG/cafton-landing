export interface Project {
  /** URL slug -- /portfolio/[slug] */
  slug: string;
  /** Client / product name, e.g. "iLigtas" */
  client: string;
  /** Case-study headline */
  title: string;
  /** Short blurb for cards (homepage + portfolio grid) */
  summary: string;
  /** Fuller paragraph for the detail page */
  description: string;
  problem?: string;
  solution?: string;
  recognition?: string;
  imageLight: string;
  imageDark: string;
  imageAlt: string;
  /** Public live URL, if the project has one -- shows a "Visit Live Site" button on the detail page. */
  liveUrl?: string;
}

export const projects: Project[] = [
  {
    slug: "iligtas",
    client: "iLigtas",
    title: "Disaster Preparedness & Emergency Response Platform",
    summary:
      "A technology platform supporting preparedness and emergency response through mobile technology, geofencing, location-based services, and web-based administration.",
    description:
      "A platform designed to support disaster preparedness and emergency response through mobile technology, geofencing, location-based services, and web-based administration.",
    problem:
      "Preparedness and response information need to reach people where they are.",
    solution:
      "A connected mobile and web platform for location-aware coordination.",
    recognition:
      "Regional Finalist, Philippine Startup Challenge 9, Cordillera; Finalist, Baguio Smart City Challenge.",
    imageLight: "/hero-light.png",
    imageDark: "/hero-dark.png",
    imageAlt: "iLigtas live geofencing alerts dashboard",
  },
  {
    slug: "scanato",
    client: "Scanato",
    title: "Scan the Table. Run the House.",
    summary:
      "A scan-to-order platform unifying QR ordering, payments, and real-time inventory for restaurants and retail, from the table to the kitchen to the point of sale.",
    description:
      "Scanato is a scan-to-order platform that lets restaurant and retail guests order directly from their phones via table-specific QR codes, while unifying ordering, payment processing, and inventory management in a single system. It removes manual ticket copying and disconnected point-of-sale data entry.",
    problem:
      "Orders placed at the table, the counter, and online each lived in their own disconnected system. Menus, tickets, and inventory drifted out of sync with each other.",
    solution:
      "One platform: table-specific QR codes open a live menu, tickets flow straight to the kitchen and floor staff, inventory updates in real time across every channel (including pickup and delivery), and guests can split payment by seat.",
    // Cover image is a placeholder -- the owner asked to reuse an existing
    // asset for now and swap in a real product screenshot later.
    imageLight: "/scanato-light.png",
    imageDark: "/scanato-dark.png",
    imageAlt: "Scanato brand mark",
    liveUrl: "https://scanato.cafton.com",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
