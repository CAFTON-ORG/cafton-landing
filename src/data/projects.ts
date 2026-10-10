import type { Project } from "@/types/content";

export const projects: Project[] = [
  {
    slug: "iligtas",
    authorId: "cafton",
    client: "iLigtas",
    title: "Disaster Preparedness & Emergency Response Platform",
    category: "Mobile Application",
    services: ["industry-platforms", "product-builds"],
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
    slug: "scanoto",
    authorId: "cafton",
    client: "Scanoto",
    title: "Scan the Table. Run the House.",
    category: "SaaS Product",
    services: ["operations", "product-builds"],
    summary:
      "A scan-to-order platform unifying QR ordering, payments, and real-time inventory for restaurants and retail, from the table to the kitchen to the point of sale.",
    description:
      "Scanoto is a scan-to-order platform that lets restaurant and retail guests order directly from their phones via table-specific QR codes, while unifying ordering, payment processing, and inventory management in a single system. It removes manual ticket copying and disconnected point-of-sale data entry.",
    problem:
      "Orders placed at the table, the counter, and online each lived in their own disconnected system. Menus, tickets, and inventory drifted out of sync with each other.",
    solution:
      "One platform: table-specific QR codes open a live menu, tickets flow straight to the kitchen and floor staff, inventory updates in real time across every channel (including pickup and delivery), and guests can split payment by seat.",
    // Cover image is a placeholder -- the owner asked to reuse an existing
    // asset for now and swap in a real product screenshot later.
    imageLight: "/scanato-light.png",
    imageDark: "/scanato-dark.png",
    imageAlt: "Scanoto home page: scan the table, run the house",
    liveUrl: "https://scanoto.cafton.com",
  },
  {
    slug: "cafton-voting-app",
    authorId: "cafton",
    client: "University of Baguio SIT",
    title: "Online Elections With One Account, One Vote",
    category: "Web Application",
    services: ["industry-platforms", "product-builds"],
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
    title: "Hand-Painted Murals, Booked Online",
    category: "Web Application",
    services: ["growth", "operations", "product-builds"],
    summary:
      "A full platform for a mural studio: a portfolio site that shows the work, an online inquiry form for new commissions, and a private dashboard for running leads, scheduling, and content.",
    description:
      "Jamil's Mural Arts began as a portfolio and is now the system the studio runs on. The public site presents the murals, services, and blog; a four-step inquiry form takes new commissions with project details and preferred timing; and an invite-only dashboard gives the studio a sales pipeline, a schedule, and editing for every page of content, with roles that decide who can do what.",
    problem:
      "A portfolio alone shows the work but leaves everything after it manual. Past murals were scattered across social media, new inquiries had no structured path in, and keeping the site current meant asking a developer for every change.",
    solution:
      "One connected system. The public site sells the work and collects structured inquiries, protected against spam and confirmed by email. Behind it, a private dashboard tracks each lead through a pipeline, schedules site visits, and lets the team edit projects, posts, services, and testimonials, with role-based access for staff.",
    imageLight: "/projects/jamils/home.jpg",
    imageDark: "/projects/jamils/home.jpg",
    imageAlt: "Jamil's Mural Arts home page: Walls worth looking at",
    media: [
      {
        src: "/projects/jamils/portfolio.jpg",
        alt: "Portfolio page filtered by commercial, residential, and public murals",
        width: 1440,
        height: 900,
        caption: "Portfolio with category filters",
      },
      {
        src: "/projects/jamils/services.jpg",
        alt: "Services page listing residential murals and what each is great for",
        width: 1440,
        height: 900,
        caption: "Services, each with what it suits",
      },
      {
        src: "/projects/jamils/booking.jpg",
        alt: "Four-step project inquiry form with project type options",
        width: 1440,
        height: 900,
        caption: "Four-step project inquiry",
      },
    ],
    liveUrl: "https://jamilsmuralarts.com",
  },
];
