import type { Project } from "@/types/content";

export const projects: Project[] = [
  {
    slug: "iligtas",
    authorId: "cafton",
    client: "iLigtas",
    title: "Disaster Preparedness & Emergency Response Platform",
    category: "Mobile Application",
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
    imageLight: "/hero-light.jpg",
    imageDark: "/hero-dark.jpg",
    imageAlt: "iLigtas live geofencing alerts dashboard",
  },
  {
    slug: "scanato",
    authorId: "cafton",
    client: "Scanato",
    title: "Scan the Table. Run the House.",
    category: "SaaS Product",
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
  {
    slug: "cafton-voting-app",
    authorId: "cafton",
    client: "University of Baguio SIT",
    title: "Online Elections With One Account, One Vote",
    category: "Web Application",
    summary:
      "A voting platform for University of Baguio School of Information Technology elections. Voters sign in with their own account, and each account can cast a single vote.",
    description:
      "Cafton Voting is the platform behind elections at the University of Baguio School of Information Technology. Voters sign in with their own account and each account casts one vote. Cafton built and runs it as the school's voting technology partner, and it also ran the voting for the Mr. and Ms. Cafton's Choice Award.",
    problem:
      "An election is only worth running if people trust the result: every eligible voter counted once, and nobody voting twice or on someone else's behalf.",
    solution:
      "Sign-in with each voter's own Google account, one vote per account, and a home screen that shows which elections are open and how many candidates are running.",
    imageLight: "/voting-app.jpg",
    imageDark: "/voting-app.jpg",
    imageAlt: "Cafton Voting home page: Secure elections, one account, one vote",
    liveUrl: "https://mmsit.cafton.com",
  },
  {
    slug: "jamils-mural-arts",
    authorId: "cafton",
    client: "Jamil's Mural Arts",
    title: "A Portfolio Site Built Around the Work Itself",
    category: "Website",
    summary:
      "A portfolio website for a mural arts studio, built to showcase completed murals and make it simple for new clients to reach out about a commission.",
    description:
      "Mural work sells on being seen. Jamil's Mural Arts needed a home for that work beyond scattered social media posts: a site organized around the murals themselves, with a clear, low-friction way for a prospective client to get in touch about a new one.",
    problem:
      "The studio's past work lived across social platforms with no single place to browse it, and no clear next step for someone who wanted to commission a piece.",
    solution:
      "A dedicated portfolio site built around the work, with a straightforward inquiry path for new commissions.",
    // Cover is the studio's own brand mark -- no product screenshot exists
    // yet since the site isn't live. Not fabricated; a real live URL and
    // real site photography slot in here once it ships.
    imageLight: "/partners/jamils-mural-arts.png",
    imageDark: "/partners/jamils-mural-arts.png",
    imageAlt: "Jamil's Mural Arts brand mark",
    imageFit: "contain",
  },
];
