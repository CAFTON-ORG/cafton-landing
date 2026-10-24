// Fills a database with believable MOCK data for the whole internal system (people, CRM, quotes,
// projects and time, schedule, finance with a balanced ledger, bank, audit trail) so every screen can
// be designed, demoed and reviewed with something real-looking in it. Never touches the website
// content (CMS): that data is real.
//
//   npm run db:local                     # terminal 1: throw-away Postgres on :5544
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres npm run db:seed-mock
//
// Everything is fictional: people, businesses and emails use example.com addresses, so no email or
// reminder can reach a real person. Dates are relative to today, so the data always looks current.
//
// SAFETY
//  - It refuses anything that is not localhost, unless you pass --allow-remote AND set
//    MOCK_SEED_CONFIRM=add-fake-data. Do not do that on production.
//  - Finance is append-only (the ledger cannot be edited or deleted by design), so mock finance
//    entries on a shared database could only be undone by reversing each one. Use a local database.
//  - Safe to run twice: it does nothing when the mock data is already there.
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const url = process.env.DATABASE_URL;
const local = url && /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const remoteOk =
  process.argv.includes("--allow-remote") && process.env.MOCK_SEED_CONFIRM === "add-fake-data";
if (!url || (!local && !remoteOk)) {
  console.error(
    "Refusing to seed mock data: DATABASE_URL must point at localhost (use `npm run db:local`).\n" +
      "To force a remote database (not production!): pass --allow-remote and set MOCK_SEED_CONFIRM=add-fake-data.",
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ dates */
const MS_DAY = 86_400_000;
const at = (offsetDays, hour = 10, minute = 0) => {
  const d = new Date(Date.now() + offsetDays * MS_DAY);
  d.setUTCHours(hour - 8, minute, 0, 0); // hour is Manila time (UTC+8)
  return d.toISOString();
};
const day = (offsetDays) => new Date(Date.now() + offsetDays * MS_DAY).toISOString().slice(0, 10);
const mondayOf = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const peso = (n) => Math.round(n * 100);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const client = new pg.Client({ connectionString: url });
await client.connect();
const q = (text, params) => client.query(text, params);
const one = async (text, params) => (await q(text, params)).rows[0];

try {
  const marker = await one(
    "SELECT count(*)::int AS n FROM organizations WHERE website LIKE 'https://mock.example.com/%'",
  );
  if (marker.n > 0) {
    console.log("Mock data is already there; nothing to do.");
    process.exit(0);
  }
  await q("BEGIN");

  /* ------------------------------------------------------------ the team */
  const roleId = async (key) => (await one("SELECT id FROM roles WHERE key = $1", [key])).id;
  const team = [
    ["Camille Reyes", "camille.reyes", "admin", false],
    ["Marco Santos", "marco.santos", "sales", true],
    ["Bianca Lim", "bianca.lim", "sales", true],
    ["Paolo Mendoza", "paolo.mendoza", "editor", false],
    ["Trisha Navarro", "trisha.navarro", "editor", false],
    ["Ernesto Villar", "ernesto.villar", "viewer", false],
  ];
  const staff = {};
  for (const [index, [name, handle, role, takesLeads]] of team.entries()) {
    const id = uuid(100 + index);
    await q(
      `INSERT INTO profiles (id, email, full_name, role_id, takes_leads)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [id, `${handle}@mock.example.com`, name, await roleId(role), takesLeads],
    );
    staff[handle.split(".")[0]] = { id, name };
  }
  const { camille, marco, bianca, paolo, trisha } = staff;

  /* ------------------------------------------------------- organisations */
  const stage = Object.fromEntries(
    (await q("SELECT key, id FROM pipeline_stages")).rows.map((row) => [row.key, row.id]),
  );
  const clients = [
    [
      "Kape Cordillera Roasters",
      "Food & Beverage",
      "11-50 employees",
      "Mariel",
      "Tolentino",
      "Owner",
    ],
    [
      "Highland Realty Partners",
      "Real Estate & Property",
      "51-200 employees",
      "Jerome",
      "Castillo",
      "Operations Manager",
    ],
    [
      "Pines City Dental Group",
      "Healthcare",
      "11-50 employees",
      "Dr. Angela",
      "Bautista",
      "Clinic Director",
    ],
    ["Burnham Outfitters", "Retail", "2-10 employees", "Rico", "Alcantara", "Owner"],
    ["Session Road Review Center", "Education", "11-50 employees", "Liza", "Ferrer", "Director"],
    [
      "Baguio Fresh Market Co-op",
      "Agriculture",
      "51-200 employees",
      "Nestor",
      "Pascual",
      "General Manager",
    ],
    [
      "Mines View Hotel & Suites",
      "Hospitality",
      "51-200 employees",
      "Cathy",
      "Domingo",
      "Revenue Manager",
    ],
    ["Strawberry Valley Foods", "Food & Beverage", "11-50 employees", "Dennis", "Aguilar", "Owner"],
    ["Camp John Hay Fitness", "Health & Wellness", "11-50 employees", "Joyce", "Manalo", "Founder"],
    [
      "Ifugao Weave Collective",
      "Arts & Crafts",
      "2-10 employees",
      "Lourdes",
      "Dulnuan",
      "Coordinator",
    ],
    ["Cordillera Logistics Corp.", "Logistics", "201-500 employees", "Albert", "Tan", "IT Head"],
    [
      "Loakan Aero Services",
      "Transport",
      "51-200 employees",
      "Grace",
      "Padilla",
      "Finance Manager",
    ],
  ];
  const org = [];
  const contact = [];
  for (const [index, [name, industry, size, first, last, position]] of clients.entries()) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const orgId = (
      await one(
        `INSERT INTO organizations (name, industry, size, website, address, updated_at)
         VALUES ($1,$2,$3,$4,$5,now()) RETURNING id`,
        [
          name,
          industry,
          size,
          `https://mock.example.com/${slug}`,
          `${10 + index * 7} Session Road, Baguio City`,
        ],
      )
    ).id;
    org.push(orgId);
    contact.push(
      (
        await one(
          `INSERT INTO contacts (first_name,last_name,email,phone,position,organization_id,source,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,now()) RETURNING id`,
          [
            first.replace("Dr. ", ""),
            last,
            `${first.toLowerCase().replace(/[^a-z]/g, "")}.${last.toLowerCase()}@${slug.slice(0, 18)}.example.com`,
            `+63917${String(2000100 + index * 137).slice(0, 7)}`,
            position,
            orgId,
            ["website", "referral", "event", "website", "referral"][index % 5],
          ],
        )
      ).id,
    );
  }

  /* --------------------------------------------------------------- deals */
  // [client index, title, stage, amount (pesos), owner, expected close in days, won days ago, lost days ago]
  const dealRows = [
    [0, "Online ordering and loyalty app", "proposal", 420_000, marco, 18],
    [1, "Property listing portal", "negotiation", 1_250_000, bianca, 9],
    [2, "Patient booking and records system", "discovery", 680_000, marco, 40],
    [3, "Store POS and stock app", "discovery", 185_000, bianca, 35],
    [4, "Enrollment and billing system", "new", 540_000, marco, 60],
    [5, "Cooperative member portal", "proposal", 390_000, bianca, 25],
    [6, "Direct booking engine", "negotiation", 860_000, marco, 12],
    [7, "Wholesale ordering portal", "new", 240_000, bianca, 55],
    [8, "Membership and class scheduling", "won", 310_000, marco, null, 20],
    [9, "Artisan e-commerce store", "won", 150_000, bianca, null, 48],
    [10, "Fleet tracking dashboard", "won", 1_480_000, marco, null, 75],
    [11, "Finance reporting automation", "won", 720_000, bianca, null, 110],
    [0, "Website refresh", "won", 95_000, marco, null, 150],
    [
      3,
      "Mobile loyalty app",
      "lost",
      420_000,
      bianca,
      null,
      null,
      14,
      "Chose a cheaper competitor",
    ],
    [5, "Inventory prototype", "lost", 260_000, marco, null, null, 33, "Postponed to next year"],
  ];
  const deal = [];
  for (const [
    clientIx,
    title,
    stageKey,
    amount,
    owner,
    closeIn,
    wonAgo,
    lostAgo,
    lostReason,
  ] of dealRows) {
    deal.push(
      (
        await one(
          `INSERT INTO deals (title, contact_id, organization_id, stage_id, amount_minor, owner_id, expected_close_date,
                              source, won_at, lost_at, lost_reason, stage_changed_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()) RETURNING id`,
          [
            title,
            contact[clientIx],
            org[clientIx],
            stage[stageKey],
            peso(amount),
            owner.id,
            closeIn === null || closeIn === undefined ? null : day(closeIn),
            ["website", "referral", "event"][deal.length % 3],
            wonAgo ? at(-wonAgo) : null,
            lostAgo ? at(-lostAgo) : null,
            lostReason ?? null,
            at(-(wonAgo ?? lostAgo ?? 3 + (deal.length % 6))),
            at(-((wonAgo ?? lostAgo ?? 10) + 25)),
          ],
        )
      ).id,
    );
  }

  // The deals that are in play get a short history.
  const history = [
    [
      0,
      [
        [
          "call",
          "Walked through the ordering flow. They want delivery tracking in phase two.",
          9,
          marco,
        ],
        ["stage_change", "Moved from Discovery to Proposal", 6, marco],
        ["note", "Budget confirmed at around 400k. Decision by end of the month.", 5, marco],
      ],
    ],
    [
      1,
      [
        ["meeting", "On-site workshop with the sales team. 40 agents, three branches.", 14, bianca],
        ["email", "Sent the revised scope and the listing import plan.", 8, bianca],
        ["stage_change", "Moved from Proposal to Negotiation", 4, bianca],
      ],
    ],
    [
      2,
      [
        ["call", "Intro call with the clinic director. Paper charts today.", 3, marco],
        ["note", "Needs SMS reminders and a patient consent flow.", 2, marco],
      ],
    ],
    [
      6,
      [
        ["meeting", "Demo of the booking engine with the revenue manager.", 11, marco],
        ["note", "Wants channel manager integration. Price is the sticking point.", 7, marco],
        ["call", "Negotiating a phased start to fit their budget.", 2, marco],
      ],
    ],
    [
      5,
      [
        ["email", "Sent the proposal for the member portal.", 6, bianca],
        ["note", "Board meets on the 28th to decide.", 3, bianca],
      ],
    ],
  ];
  for (const [dealIx, items] of history)
    for (const [type, body, ago, owner] of items)
      await q(
        `INSERT INTO activities (type, body, deal_id, created_by, created_by_name, created_at)
         VALUES ($1::activity_type,$2,$3,$4,$5,$6)`,
        [type, body, deal[dealIx], owner.id, owner.name, at(-ago, 9 + (ago % 7))],
      );

  /* --------------------------------------------------------------- leads */
  const leads = [
    [
      "Grace",
      "Villanueva",
      "Kapeng Baguio",
      "Operations",
      "₱100k - ₱500k",
      "1-3 months",
      "new",
      0,
      null,
    ],
    ["Ramon", "Aquino", "Aquino Hardware", "Growth", "₱500k - ₱1M", "3-6 months", "new", 1, null],
    [
      "Sheila",
      "Magno",
      "Magno Dental Supplies",
      "Operations",
      "₱100k - ₱500k",
      "1-3 months",
      "new",
      1,
      null,
    ],
    ["Carlo", "Estrada", "Estrada Surf & Dive", "Growth", "₱100k - ₱500k", "ASAP", "new", 2, null],
    ["Liza", "Ocampo", null, "Product builds", "Under ₱100k", "ASAP", "qualified", 4, null],
    [
      "Vince",
      "Salazar",
      "Salazar Builders",
      "Operations",
      "₱500k - ₱1M",
      "3-6 months",
      "qualified",
      6,
      null,
    ],
    [
      "Hannah",
      "Cruz",
      "Cruz Bakery & Cafe",
      "Growth",
      "₱100k - ₱500k",
      "1-3 months",
      "qualified",
      9,
      null,
    ],
    [
      "Ben",
      "Ramos",
      "Ramos Gym",
      "Growth",
      "Under ₱100k",
      "Not sure yet",
      "disqualified",
      12,
      "Budget far below our minimum",
    ],
    [
      "Tess",
      "Quizon",
      "Quizon Travel",
      "Growth",
      "Under ₱100k",
      "Not sure yet",
      "disqualified",
      17,
      "Not a fit: wants a template website",
    ],
  ];
  const lead = [];
  for (const [first, last, business, area, budget, timeline, status, ago, reason] of leads) {
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@${(business ?? "gmail")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 16)}.example.com`;
    lead.push(
      (
        await one(
          `INSERT INTO leads (first_name,last_name,email,phone,business_name,goals_area,budget,timeline,source,page_path,
                              answers,status,disqualified_reason,created_at,updated_at)
           VALUES ($1,$2,$3,'+639170000000',$4,$5,$6,$7,'Contact Us Page','/contact',$8,$9,$10,$11,$11) RETURNING id`,
          [
            first,
            last,
            email,
            business,
            area,
            budget,
            timeline,
            JSON.stringify({
              firstName: first,
              lastName: last,
              email,
              businessName: business,
              budget,
              timeline,
              goalsCategory: "operations",
              goals: ["Inventory", "Reporting"],
              challenges: ["We still rely on spreadsheets, paper, or messaging apps"],
              notes: "We would like to talk this week if possible.",
            }),
            status,
            reason,
            at(-ago, 11),
          ],
        )
      ).id,
    );
  }

  /* --------------------------------------------------------------- tasks */
  const tasks = [
    ["Reply to Grace Villanueva", 0, lead[0], null, marco, false],
    ["Call Ramon Aquino back about scope", 1, lead[1], null, bianca, false],
    ["Send the proposal to Kape Cordillera Roasters", -1, null, deal[0], marco, false],
    ["Book a discovery call with Pines City Dental", 3, null, deal[2], marco, false],
    ["Prepare the negotiation deck for Mines View", 2, null, deal[6], marco, false],
    ["Follow up on the signed agreement: Highland Realty", -3, null, deal[1], bianca, false],
    ["Confirm the board date with the co-op", 5, null, deal[5], bianca, false],
    ["Update the case study for the logistics project", -6, null, null, camille, false],
    ["Send thank-you note after the workshop", -10, null, deal[1], bianca, true],
    ["Log the intro call notes", -4, null, deal[2], marco, true],
  ];
  for (const [title, dueIn, leadId, dealId, owner, done] of tasks)
    await q(
      `INSERT INTO tasks (title, due_at, lead_id, deal_id, assignee_id, created_by, done_at)
       VALUES ($1,$2,$3,$4,$5,$5,$6)`,
      [title, at(dueIn, 17), leadId, dealId, owner.id, done ? at(dueIn + 1) : null],
    );

  /* ------------------------------------------------------ price list, quotes */
  const catalog = await q(
    `INSERT INTO catalog_items (name, description, pricing_model, unit_price_minor, unit_label, taxable, updated_at)
     VALUES
       ('Discovery workshop', 'Two half-day sessions to map the problem and scope.', 'fixed', 4500000, 'project', false, now()),
       ('Web application build', 'Design, build and launch of a custom web app.', 'fixed', 38000000, 'project', false, now()),
       ('Mobile app build', 'iOS and Android app from one codebase.', 'fixed', 52000000, 'project', false, now()),
       ('Engineering time', 'Senior engineer, billed by the hour.', 'hourly', 250000, 'hour', false, now()),
       ('Design sprint', 'One week of UX and visual design.', 'fixed', 9500000, 'week', false, now()),
       ('Support retainer', 'Fixes and small changes, monthly.', 'retainer', 3500000, 'month', false, now())
     RETURNING id, name`,
  );
  const item = Object.fromEntries(catalog.rows.map((row) => [row.name, row.id]));
  const lineTotal = (qty, price, disc) => Math.round(((qty * price) / 1000) * (1 - disc / 100));
  const quote = async (ref, dealIx, title, status, validDays, lines, sentAgo) => {
    const built = lines.map(([name, desc, qty, unit, price, disc]) => ({
      name,
      desc,
      qty,
      unit,
      price,
      disc,
      total: lineTotal(qty, price, disc),
    }));
    const subtotal = built.reduce((sum, l) => sum + l.total, 0);
    const made = await one(
      `INSERT INTO quotes (reference, deal_id, title, intro, terms, status, tax_rate_pct, subtotal_minor, tax_minor, total_minor,
                           valid_until, deposit_pct, payment_terms, updated_at)
       VALUES ($1,$2,$3,$4,$5,'draft',0,$6,0,$6,$7,50,$8,now()) RETURNING id`,
      [
        ref,
        deal[dealIx],
        title,
        "Thank you for your time. Here is what we propose, based on our conversations.",
        "Includes two rounds of revisions. Hosting and third-party fees are billed separately.",
        subtotal,
        day(validDays),
        "A 50% deposit is due when the quote is accepted; the balance on completion.",
      ],
    );
    for (const [position, l] of built.entries())
      await q(
        `INSERT INTO quote_lines (quote_id, position, catalog_item_id, description, quantity_milli, unit_label,
                                  unit_price_minor, discount_pct, taxable, total_minor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9)`,
        [made.id, position, item[l.name], l.desc, l.qty, l.unit, l.price, l.disc, l.total],
      );
    // A trigger locks the lines of a sent quote, so it is marked sent only once they are in.
    if (status === "sent")
      await q(
        "UPDATE quotes SET status = 'sent', token_hash = $2, sent_at = $3, sent_to = $4 WHERE id = $1",
        [made.id, hash(`mock-${ref}`), at(-sentAgo), "client@mock.example.com"],
      );
  };
  await quote(
    "QT-2026-0101",
    0,
    "Online ordering and loyalty app",
    "sent",
    14,
    [
      ["Discovery workshop", "Discovery workshop", 1000, "project", 4500000, 0],
      ["Web application build", "Ordering web app and admin", 1000, "project", 38000000, 10],
    ],
    5,
  );
  await quote(
    "QT-2026-0102",
    1,
    "Property listing portal",
    "sent",
    10,
    [
      ["Discovery workshop", "Discovery workshop", 1000, "project", 4500000, 0],
      [
        "Web application build",
        "Listing portal, agent dashboards and import",
        2500,
        "project",
        38000000,
        15,
      ],
      ["Support retainer", "Support retainer, first 3 months", 3000, "month", 3500000, 0],
    ],
    9,
  );
  await quote(
    "QT-2026-0103",
    5,
    "Cooperative member portal",
    "sent",
    20,
    [
      ["Design sprint", "Design sprint", 2000, "week", 9500000, 0],
      ["Web application build", "Member portal", 1000, "project", 38000000, 0],
    ],
    6,
  );
  await quote("QT-2026-0104", 6, "Direct booking engine", "draft", 21, [
    ["Web application build", "Booking engine and payment flow", 2000, "project", 38000000, 12],
    ["Engineering time", "Channel manager integration", 60000, "hour", 250000, 0],
  ]);
  await quote("QT-2026-0105", 2, "Patient booking and records system", "draft", 30, [
    ["Discovery workshop", "Discovery workshop", 1000, "project", 4500000, 0],
    ["Web application build", "Booking and records", 1500, "project", 38000000, 0],
  ]);

  /* ---------------------------------------------------- projects and time */
  const projectsPlan = [
    // deal index, name, status, start, due, budget (pesos), minutes budget, manager
    [10, "Fleet tracking dashboard", "active", -68, 22, 1_480_000, 1100 * 60, paolo],
    [11, "Finance reporting automation", "active", -100, -6, 720_000, 520 * 60, trisha],
    [8, "Membership and class scheduling", "active", -16, 40, 310_000, 260 * 60, paolo],
    [9, "Artisan e-commerce store", "planned", null, 75, 150_000, null, trisha],
    [12, "Website refresh", "completed", -140, -95, 95_000, 90 * 60, camille],
  ];
  const project = [];
  for (const [dealIx, name, status, start, due, budget, minutes, manager] of projectsPlan)
    project.push(
      (
        await one(
          `INSERT INTO projects (name, description, deal_id, contact_id, organization_id, status, manager_id,
                                 start_date, due_date, budget_minor, budget_minutes, completed_at, updated_at)
           SELECT $1, $2, d.id, d.contact_id, d.organization_id, $3::project_status, $4, $5, $6, $7, $8, $9, now()
             FROM deals d WHERE d.id = $10 RETURNING id`,
          [
            name,
            `Delivery of the ${name.toLowerCase()} agreed in the proposal.`,
            status,
            manager.id,
            start === null ? null : day(start),
            day(due),
            peso(budget),
            minutes,
            status === "completed" ? at(due) : null,
            deal[dealIx],
          ],
        )
      ).id,
    );
  const crew = [camille, paolo, trisha, marco];
  const rates = { [camille.id]: 55000, [paolo.id]: 45000, [trisha.id]: 40000, [marco.id]: 38000 };
  for (const [index, id] of project.entries())
    for (const person of index === 0 ? crew.slice(0, 3) : index === 4 ? [camille] : [paolo, trisha])
      await q(
        "INSERT INTO project_members (project_id, profile_id, cost_rate_minor) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [id, person.id, rates[person.id]],
      );

  const milestone = async (projectId, name, due, status, position, amount, billable = true) =>
    (
      await one(
        `INSERT INTO milestones (project_id, name, description, due_date, status, position, billable, amount_minor, completed_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::milestone_status,$6,$7,$8,$9,now()) RETURNING id`,
        [
          projectId,
          name,
          `${name}: agreed deliverable.`,
          day(due),
          status,
          position,
          billable,
          peso(amount),
          status === "done" ? at(due) : null,
        ],
      )
    ).id;
  const m = {
    fleetDesign: await milestone(
      project[0],
      "Design and data model signed off",
      -45,
      "done",
      0,
      370_000,
    ),
    fleetBeta: await milestone(project[0], "Tracking beta with two depots", -2, "done", 1, 444_000),
    fleetRollout: await milestone(
      project[0],
      "Full roll-out and training",
      22,
      "in_progress",
      2,
      666_000,
    ),
    finSpec: await milestone(project[1], "Reports specified", -80, "done", 0, 216_000),
    finBuild: await milestone(
      project[1],
      "Automated month-end pack",
      -6,
      "in_progress",
      1,
      504_000,
    ),
    gymBuild: await milestone(
      project[2],
      "Scheduling and bookings live",
      40,
      "in_progress",
      0,
      310_000,
    ),
    shopDesign: await milestone(project[3], "Store design", 30, "pending", 0, 75_000),
    shopBuild: await milestone(project[3], "Build and launch", 75, "pending", 1, 75_000),
    webDone: await milestone(project[4], "Launch", -95, "done", 0, 95_000),
  };

  const ptask = async (
    projectId,
    milestoneId,
    title,
    status,
    priority,
    who,
    dueIn,
    estimate,
    position,
  ) =>
    q(
      `INSERT INTO project_tasks (project_id, milestone_id, title, status, priority, assignee_id, due_date,
                                  estimate_minutes, position, completed_at, updated_at)
       VALUES ($1,$2,$3,$4::project_task_status,$5::project_task_priority,$6,$7,$8,$9,$10,now())`,
      [
        projectId,
        milestoneId,
        title,
        status,
        priority,
        who.id,
        dueIn === null ? null : day(dueIn),
        estimate,
        position,
        status === "done" ? at(dueIn ?? -1) : null,
      ],
    );
  const T = [
    [
      project[0],
      m.fleetRollout,
      "Depot onboarding sessions",
      "todo",
      "normal",
      camille,
      14,
      480,
      0,
    ],
    [
      project[0],
      m.fleetRollout,
      "Driver mobile check-in screen",
      "in_progress",
      "high",
      paolo,
      6,
      1200,
      1,
    ],
    [
      project[0],
      m.fleetRollout,
      "Alerts for late and off-route vehicles",
      "review",
      "high",
      trisha,
      4,
      900,
      2,
    ],
    [project[0], m.fleetRollout, "Export daily trip report", "todo", "low", paolo, 18, 360, 3],
    [project[0], m.fleetBeta, "Live map with vehicle history", "done", "high", paolo, -8, 1800, 0],
    [
      project[0],
      m.fleetBeta,
      "Role-based access for depot managers",
      "done",
      "normal",
      trisha,
      -5,
      720,
      1,
    ],
    [project[1], m.finBuild, "Month-end pack template", "in_progress", "high", trisha, -2, 960, 0],
    [project[1], m.finBuild, "Scheduled delivery to finance", "todo", "normal", trisha, 5, 480, 1],
    [project[1], m.finBuild, "Reconciliation checks", "review", "normal", paolo, -4, 600, 2],
    [
      project[2],
      m.gymBuild,
      "Class calendar and capacity rules",
      "in_progress",
      "normal",
      paolo,
      12,
      1080,
      0,
    ],
    [project[2], m.gymBuild, "Member booking app", "todo", "high", trisha, 24, 1500, 1],
    [project[2], m.gymBuild, "Waitlist notifications", "todo", "low", trisha, 32, 420, 2],
    [
      project[3],
      m.shopDesign,
      "Moodboard and product photography plan",
      "todo",
      "normal",
      trisha,
      20,
      300,
      0,
    ],
    [project[4], m.webDone, "Homepage and menu pages", "done", "normal", camille, -100, 600, 0],
  ];
  for (const t of T) await ptask(...t);

  // Eight weeks of time: older weeks approved, last week submitted, this week still draft.
  const timePlan = [
    [project[0], paolo, [420, 450, 480, 420, 360]],
    [project[0], trisha, [300, 360, 330, 300, 240]],
    [project[0], camille, [60, 90, 60, 90, 60]],
    [project[1], trisha, [150, 120, 180, 120, 150]],
    [project[2], paolo, [60, 90, 60, 60, 120]],
  ];
  const notes = [
    "Build and review",
    "Pairing with client",
    "Bug fixes",
    "Planning and estimates",
    "Testing",
  ];
  for (const [projectId, person, pattern] of timePlan)
    for (let week = 7; week >= 0; week--)
      for (const [dayIx, minutes] of pattern.entries()) {
        const date = day(-week * 7 - ((new Date().getUTCDay() + 6) % 7) + dayIx);
        if (date > day(0)) continue;
        const status = week >= 2 ? "approved" : week === 1 ? "submitted" : "draft";
        await q(
          `INSERT INTO time_entries (project_id, profile_id, work_date, week_start, minutes, status, note, billable,
                                     updated_at, reviewed_by, reviewed_at)
           VALUES ($1,$2,$3,$4,$5,$6::time_entry_status,$7,true,now(),$8,$9)`,
          [
            projectId,
            person.id,
            date,
            mondayOf(date),
            minutes,
            status,
            notes[(dayIx + week) % notes.length],
            status === "approved" ? camille.id : null,
            status === "approved" ? at(-week * 7 + 3) : null,
          ],
        ).catch((error) => {
          // A person logging two projects the same day is fine; anything else is a mistake in this script.
          if (!/duplicate key/.test(error.message)) throw error;
        });
      }

  /* ------------------------------------------------------------ schedule */
  const meet = (title, dayOffset, hour, mode, status, who, clientIx, ownerStaff, dealIx = null) =>
    q(
      `INSERT INTO meetings (title, starts_at, ends_at, mode, location, status, source, attendee_name, attendee_email,
                             contact_id, deal_id, owner_id, created_by)
       VALUES ($1,$2,$3,$4::meeting_mode,$5,$6::meeting_status,$7,$8,$9,$10,$11,$12,$12)`,
      [
        title,
        at(dayOffset, hour),
        at(dayOffset, hour + 1),
        mode,
        mode === "in_person"
          ? "Cafton office, Session Road, Baguio"
          : mode === "video"
            ? "Google Meet"
            : null,
        status,
        status === "requested" ? "booking_page" : "staff",
        who,
        `${who.toLowerCase().replace(/[^a-z]+/g, ".")}@mock.example.com`,
        contact[clientIx],
        dealIx === null ? null : deal[dealIx],
        ownerStaff.id,
      ],
    );
  await meet(
    "Proposal walkthrough: Kape Cordillera",
    1,
    10,
    "video",
    "confirmed",
    "Mariel Tolentino",
    0,
    marco,
    0,
  );
  await meet(
    "Negotiation call: Mines View",
    2,
    14,
    "video",
    "confirmed",
    "Cathy Domingo",
    6,
    marco,
    6,
  );
  await meet(
    "Discovery: Pines City Dental",
    3,
    11,
    "in_person",
    "confirmed",
    "Angela Bautista",
    2,
    marco,
    2,
  );
  await meet("Co-op board follow-up", 6, 15, "phone", "confirmed", "Nestor Pascual", 5, bianca, 5);
  await meet(
    "Intro call (website request)",
    4,
    10,
    "video",
    "requested",
    "Sheila Magno",
    3,
    bianca,
  );
  await meet(
    "Intro call (website request)",
    5,
    16,
    "video",
    "requested",
    "Carlo Estrada",
    7,
    marco,
  );
  await meet(
    "Workshop: Highland Realty",
    -14,
    13,
    "in_person",
    "completed",
    "Jerome Castillo",
    1,
    bianca,
    1,
  );
  await meet(
    "Kick-off: Fleet tracking",
    -70,
    9,
    "in_person",
    "completed",
    "Albert Tan",
    10,
    camille,
  );
  await meet("Demo: Mines View", -11, 14, "video", "completed", "Cathy Domingo", 6, marco, 6);
  await meet("Intro call", -8, 10, "video", "no_show", "Ramon Aquino", 3, marco);

  /* -------------------------------------------------------------- finance */
  const account = async (key) =>
    (await one("SELECT id FROM accounts WHERE system_key = $1", [key])).id;
  const byCode = async (code) => (await one("SELECT id FROM accounts WHERE code = $1", [code])).id;
  const A = {
    cash: await account("cash"),
    bank: await account("bank"),
    ar: await account("ar"),
    cwt: await account("cwt_receivable"),
    ap: await account("ap"),
    revenue: await account("revenue_services"),
    capital: await byCode("3000"),
    cos: await byCode("5000"),
    rent: await byCode("6100"),
    util: await byCode("6200"),
    software: await byCode("6300"),
    marketing: await byCode("6400"),
    fees: await byCode("6500"),
    salaries: await account("salaries"),
    misc: await byCode("6990"),
  };
  const counters = {};
  const nextNumber = (prefix, date) => {
    const year = date.slice(0, 4);
    const key = `${prefix}:${year}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return `${prefix}-${year}-${String(counters[key]).padStart(4, "0")}`;
  };
  const post = async (date, memo, kind, sourceId, lines, by = camille) => {
    const entry = await one(
      `INSERT INTO journal_entries (entry_date, memo, source_kind, source_id, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [date, memo, kind, sourceId, by.id, by.name],
    );
    for (const [position, [accountId, debit, credit]] of lines.entries())
      await q(
        `INSERT INTO journal_lines (entry_id, account_id, position, debit_minor, credit_minor)
         VALUES ($1,$2,$3,$4,$5)`,
        [entry.id, accountId, position, debit, credit],
      );
    return entry.id;
  };

  // The books start with the owners' capital and a cash float.
  const openingDay = day(-215);
  await post(openingDay, "Opening balances: owners' capital", "opening", null, [
    [A.bank, peso(1_200_000), 0],
    [A.cash, peso(30_000), 0],
    [A.capital, 0, peso(1_230_000)],
  ]);
  const bankAccount = await one(
    `INSERT INTO bank_accounts (name, account_id, number_hint, updated_at) VALUES ('BDO Business Checking', $1, '4821', now()) RETURNING id`,
    [A.bank],
  );

  // Invoices: [client, days since issue, terms, services, how it was paid]. Amounts in pesos, no VAT (8% option).
  const invoicePlan = [
    [11, 205, 15, [["Reporting automation: specification", 216_000]], "full", 0],
    [0, 190, 15, [["Website refresh: design and build", 95_000]], "full", 0.02],
    [10, 180, 30, [["Fleet tracking: design and data model", 370_000]], "full", 0.02],
    [11, 160, 30, [["Reporting automation: build, first half", 252_000]], "full", 0],
    [0, 140, 15, [["Website maintenance, 6 months", 36_000]], "full", 0],
    [10, 120, 30, [["Fleet tracking: tracking beta", 444_000]], "full", 0.02],
    [9, 95, 15, [["Artisan store: discovery workshop", 45_000]], "full", 0],
    [
      6,
      80,
      15,
      [
        ["Direct booking: discovery workshop", 45_000],
        ["Competitor review", 22_000],
      ],
      "full",
      0,
    ],
    [8, 62, 15, [["Membership app: deposit (50%)", 155_000]], "full", 0],
    [11, 55, 30, [["Reporting automation: build, second half", 252_000]], "full", 0.02],
    [10, 48, 30, [["Fleet tracking: roll-out deposit", 333_000]], "partial", 0],
    [0, 33, 15, [["Support retainer, October", 35_000]], "full", 0],
    [2, 28, 15, [["Patient booking: discovery workshop", 45_000]], "none", 0],
    [8, 24, 15, [["Membership app: design milestone", 62_000]], "none", 0],
    [5, 19, 30, [["Member portal: design sprint", 190_000]], "none", 0],
    [7, 12, 15, [["Wholesale portal: scoping", 38_000]], "none", 0],
    [10, 6, 30, [["Fleet tracking: training workshops", 120_000]], "none", 0],
  ];
  invoicePlan.sort((a, b) => b[1] - a[1]);
  const invoiceIds = [];
  for (const [clientIx, ago, terms, linePlan, mode, cwtRate] of invoicePlan) {
    const issue = day(-ago);
    const due = day(-ago + terms);
    const subtotal = linePlan.reduce((sum, [, amount]) => sum + peso(amount), 0);
    const number = nextNumber("INV", issue);
    const inv = await one(
      `INSERT INTO invoices (organization_id, contact_id, client_name, client_email, client_address, client_tin, status,
                             issue_date, due_date, tax_code, tax_rate_bp, subtotal_minor, tax_minor, total_minor,
                             payment_instructions, sent_at, sent_to, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,'NOVAT',0,$9,0,$9,$10,NULL,NULL,$11,now()) RETURNING id`,
      [
        org[clientIx],
        contact[clientIx],
        clients[clientIx][0],
        `accounts@mock.example.com`,
        `${10 + clientIx * 7} Session Road, Baguio City`,
        `000-${String(100 + clientIx * 13)}-${String(200 + clientIx * 7)}-000`,
        issue,
        due,
        subtotal,
        "Please pay by bank transfer to BDO Business Checking ending 4821 and send us the reference.",
        camille.id,
      ],
    );
    for (const [position, [description, amount]] of linePlan.entries())
      await q(
        `INSERT INTO invoice_lines (invoice_id, position, description, quantity_milli, unit_label, unit_price_minor, amount_minor, taxable)
         VALUES ($1,$2,$3,1000,'item',$4,$4,false)`,
        [inv.id, position, description, peso(amount)],
      );
    const entry = await post(
      issue,
      `Invoice ${number}: ${clients[clientIx][0]}`,
      "invoice",
      inv.id,
      [
        [A.ar, subtotal, 0],
        [A.revenue, 0, subtotal],
      ],
    );
    await q(
      `UPDATE invoices SET status = 'issued', number = $2, journal_entry_id = $3, sent_at = $4, sent_to = $5 WHERE id = $1`,
      [inv.id, number, entry, at(-ago, 15), "accounts@mock.example.com"],
    );
    invoiceIds.push({
      id: inv.id,
      clientIx,
      number,
      issue,
      due,
      subtotal,
      terms,
      mode,
      cwtRate,
      ago,
    });
  }
  // Two drafts to finish: a milestone bill and one for next month's retainer.
  for (const [clientIx, linePlan] of [
    [8, [["Membership app: scheduling go-live", 93_000]]],
    [0, [["Support retainer, November", 35_000]]],
  ]) {
    const total = linePlan.reduce((sum, [, amount]) => sum + peso(amount), 0);
    const draft = await one(
      `INSERT INTO invoices (organization_id, contact_id, client_name, client_email, status, tax_code, tax_rate_bp,
                             subtotal_minor, tax_minor, total_minor, created_by, updated_at)
       VALUES ($1,$2,$3,'accounts@mock.example.com','draft','NOVAT',0,$4,0,$4,$5,now()) RETURNING id`,
      [org[clientIx], contact[clientIx], clients[clientIx][0], total, camille.id],
    );
    for (const [position, [description, amount]] of linePlan.entries())
      await q(
        `INSERT INTO invoice_lines (invoice_id, position, description, quantity_milli, unit_label, unit_price_minor, amount_minor, taxable)
         VALUES ($1,$2,$3,1000,'item',$4,$4,false)`,
        [draft.id, position, description, peso(amount)],
      );
  }

  // Payments, in date order so receipt numbers run in sequence. A client that withheld tax paid the
  // invoice less the withholding; the withholding is a credit to claim against the income tax.
  const payments = [];
  for (const inv of invoiceIds) {
    if (inv.mode === "none") continue;
    const gross = Math.round(inv.subtotal * (inv.mode === "partial" ? 0.5 : 1));
    const cwt = Math.round(gross * inv.cwtRate);
    const lag =
      inv.mode === "partial"
        ? 12
        : Math.max(3, Math.min(inv.terms + (inv.ago % 5) - 2, inv.ago - 1));
    payments.push({ inv, gross, cwt, date: day(-inv.ago + lag) });
  }
  payments.sort((a, b) => a.date.localeCompare(b.date));
  const methods = ["bank_transfer", "bank_transfer", "gcash", "check", "bank_transfer"];
  for (const [index, p] of payments.entries()) {
    const number = nextNumber("RCT", p.date);
    const paymentId = randomUUID();
    const lines = [[A.bank, p.gross - p.cwt, 0]];
    if (p.cwt > 0) lines.push([A.cwt, p.cwt, 0]);
    lines.push([A.ar, 0, p.gross]);
    const entry = await post(
      p.date,
      `Payment ${number} from ${clients[p.inv.clientIx][0]}`,
      "payment",
      paymentId,
      lines,
    );
    await q(
      `INSERT INTO payments (id, number, received_date, amount_minor, cwt_minor, method, reference, deposit_account_id,
                             organization_id, contact_id, client_name, status, journal_entry_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'recorded',$12,$13)`,
      [
        paymentId,
        number,
        p.date,
        p.gross - p.cwt,
        p.cwt,
        methods[index % methods.length],
        `REF${40210 + index * 17}`,
        A.bank,
        org[p.inv.clientIx],
        contact[p.inv.clientIx],
        clients[p.inv.clientIx][0],
        entry,
        camille.id,
      ],
    );
    await q(
      "INSERT INTO payment_allocations (payment_id, invoice_id, amount_minor) VALUES ($1,$2,$3)",
      [paymentId, p.inv.id, p.gross],
    );
  }

  // Suppliers and bills. [vendor, expense account, what, pesos, days since bill date, terms, how it was paid]
  const vendorRows = [
    ["Brightwater Co-Working", A.rent, 15, "billing@brightwater.example.com"],
    ["Luzon Power & Light", A.util, 20, "customer@luzonpower.example.com"],
    ["NetStream Fiber", A.util, 15, "accounts@netstream.example.com"],
    ["CloudNine Hosting", A.software, 15, "billing@cloudnine.example.com"],
    ["Pixelhaus Studio", A.cos, 30, "hello@pixelhaus.example.com"],
    ["Ledgerwise Accounting", A.fees, 15, "invoices@ledgerwise.example.com"],
    ["Kalye Print & Signage", A.marketing, 15, "orders@kalyeprint.example.com"],
  ];
  const vendor = [];
  for (const [name, accountId, terms, email] of vendorRows)
    vendor.push(
      (
        await one(
          `INSERT INTO vendors (name, email, default_account_id, terms_days, updated_at) VALUES ($1,$2,$3,$4,now()) RETURNING id`,
          [name, email, accountId, terms],
        )
      ).id,
    );
  const billPlan = [
    [0, "Office desk rental, May", 18_000, 170, "full"],
    [1, "Electricity, May", 4_850, 165, "full"],
    [2, "Internet, May", 2_499, 163, "full"],
    [3, "Cloud hosting, Q2", 21_600, 150, "full"],
    [0, "Office desk rental, June", 18_000, 140, "full"],
    [5, "Bookkeeping, Q2", 12_000, 130, "full"],
    [4, "UI illustration pack (Fleet project)", 48_000, 110, "full"],
    [0, "Office desk rental, July", 18_000, 108, "full"],
    [1, "Electricity, July", 5_320, 100, "full"],
    [0, "Office desk rental, August", 18_000, 78, "full"],
    [3, "Cloud hosting, Q3", 22_400, 62, "full"],
    [6, "Pull-up banners for the trade fair", 9_800, 55, "full"],
    [0, "Office desk rental, September", 18_000, 47, "full"],
    [1, "Electricity, September", 5_760, 40, "full"],
    [5, "Bookkeeping, Q3", 12_000, 38, "full"],
    [4, "Mobile prototype (Gym project)", 36_000, 35, "partial"],
    [0, "Office desk rental, October", 18_000, 24, "none"],
    [2, "Internet, October", 2_499, 14, "none"],
    [1, "Electricity, October", 5_980, 9, "none"],
    [4, "Illustration refresh (Store project)", 28_000, 6, "none"],
  ];
  const billRows = billPlan.map(([vendorIx, what, amount, ago, mode]) => ({
    vendorIx,
    what,
    amount: peso(amount),
    date: day(-ago),
    ago,
    mode,
    due: day(-ago + vendorRows[vendorIx][2]),
  }));
  billRows.sort((a, b) => a.date.localeCompare(b.date));
  const billIds = [];
  for (const b of billRows) {
    const number = nextNumber("BILL", b.date);
    const bill = await one(
      `INSERT INTO bills (vendor_id, vendor_name, vendor_ref, bill_date, due_date, total_minor, status, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,now()) RETURNING id`,
      [
        vendor[b.vendorIx],
        vendorRows[b.vendorIx][0],
        `SI-${3100 + billIds.length * 11}`,
        b.date,
        b.due,
        b.amount,
        camille.id,
      ],
    );
    await q(
      `INSERT INTO bill_lines (bill_id, position, description, account_id, amount_minor) VALUES ($1,0,$2,$3,$4)`,
      [bill.id, b.what, vendorRows[b.vendorIx][1], b.amount],
    );
    const entry = await post(
      b.date,
      `Bill ${number}: ${vendorRows[b.vendorIx][0]}`,
      "bill",
      bill.id,
      [
        [vendorRows[b.vendorIx][1], b.amount, 0],
        [A.ap, 0, b.amount],
      ],
    );
    await q(
      `UPDATE bills SET status = 'approved', number = $2, journal_entry_id = $3, approved_by = $4, approved_at = $5 WHERE id = $1`,
      [bill.id, number, entry, camille.id, at(-b.ago, 14)],
    );
    billIds.push({ ...b, id: bill.id });
  }
  // Three bills still being entered.
  for (const [vendorIx, what, amount] of [
    [0, "Office desk rental, November", 18_000],
    [3, "Domain renewals", 7_200],
    [6, "Brochures for the Q4 campaign", 15_500],
  ]) {
    const total = peso(amount);
    const draft = await one(
      `INSERT INTO bills (vendor_id, vendor_name, bill_date, due_date, total_minor, status, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,'draft',$6,now()) RETURNING id`,
      [
        vendor[vendorIx],
        vendorRows[vendorIx][0],
        day(0),
        day(vendorRows[vendorIx][2]),
        total,
        camille.id,
      ],
    );
    await q(
      `INSERT INTO bill_lines (bill_id, position, description, account_id, amount_minor) VALUES ($1,0,$2,$3,$4)`,
      [draft.id, what, vendorRows[vendorIx][1], total],
    );
  }
  const billPayments = [];
  for (const b of billIds) {
    if (b.mode === "none") continue;
    const paid = b.mode === "partial" ? Math.round(b.amount / 2) : b.amount;
    billPayments.push({ b, paid, date: day(-b.ago + Math.min(b.due ? 12 : 12, b.ago - 1)) });
  }
  billPayments.sort((a, b) => a.date.localeCompare(b.date));
  for (const [index, p] of billPayments.entries()) {
    const number = nextNumber("BPAY", p.date);
    const paymentId = randomUUID();
    const entry = await post(
      p.date,
      `Paid ${vendorRows[p.b.vendorIx][0]} (${number})`,
      "payment",
      paymentId,
      [
        [A.ap, p.paid, 0],
        [A.bank, 0, p.paid],
      ],
    );
    await q(
      `INSERT INTO bill_payments (id, number, bill_id, paid_date, amount_minor, method, reference, paid_from_account_id,
                                  status, journal_entry_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'recorded',$9,$10)`,
      [
        paymentId,
        number,
        p.b.id,
        p.date,
        p.paid,
        index % 3 === 0 ? "check" : "bank_transfer",
        `PAY${7100 + index * 9}`,
        A.bank,
        entry,
        camille.id,
      ],
    );
  }

  // Expenses people paid out of pocket or from petty cash.
  const expensePlan = [
    ["Petty cash: printing and courier", 1_850, 150, A.misc, A.cash, "approved"],
    ["Client lunch, Kape Cordillera", 3_200, 120, A.marketing, A.bank, "approved"],
    ["Trade fair booth fee", 24_000, 92, A.marketing, A.bank, "approved"],
    ["Domain: caftonph.example", 1_450, 84, A.software, A.bank, "approved"],
    ["Team meals during launch week", 5_600, 60, A.misc, A.cash, "approved"],
    ["Figma and design tool seats", 8_900, 41, A.software, A.bank, "approved"],
    ["Taxi to client site, Mines View", 780, 17, A.misc, A.cash, "approved"],
    ["Coworking day passes (visiting engineer)", 2_400, 8, A.rent, A.cash, "submitted"],
    ["Conference ticket: product summit", 12_500, 5, A.marketing, A.bank, "submitted"],
    ["Notebook purchase (not business)", 3_990, 22, A.misc, A.cash, "rejected"],
  ];
  expensePlan.sort((a, b) => b[2] - a[2]);
  const submitters = [paolo, trisha, camille];
  for (const [
    index,
    [description, amount, ago, accountId, paidFrom, status],
  ] of expensePlan.entries()) {
    const date = day(-ago);
    const submitter = submitters[index % submitters.length];
    const minor = peso(amount);
    if (status === "approved") {
      const number = nextNumber("EXP", date);
      const expenseId = randomUUID();
      const entry = await post(date, `Expense ${number}: ${description}`, "expense", expenseId, [
        [accountId, minor, 0],
        [paidFrom, 0, minor],
      ]);
      await q(
        `INSERT INTO expenses (id, number, status, expense_date, payee, description, account_id, amount_minor, paid_from_account_id,
                               submitted_by, submitted_by_name, decided_by, decided_by_name, decided_at, journal_entry_id, updated_at)
         VALUES ($1,$2,'approved',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())`,
        [
          expenseId,
          number,
          date,
          description.split(":")[0].split(",")[0],
          description,
          accountId,
          minor,
          paidFrom,
          submitter.id,
          submitter.name,
          camille.id,
          camille.name,
          at(-ago + 1),
          entry,
        ],
      );
    } else {
      await q(
        `INSERT INTO expenses (status, expense_date, payee, description, account_id, amount_minor, paid_from_account_id,
                               submitted_by, submitted_by_name, reject_reason, decided_by, decided_by_name, decided_at, updated_at)
         VALUES ($1::expense_status,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())`,
        [
          status,
          date,
          description.split(":")[0].split(",")[0],
          description,
          accountId,
          minor,
          paidFrom,
          submitter.id,
          submitter.name,
          status === "rejected" ? "Personal purchase: not a business expense." : null,
          status === "rejected" ? camille.id : null,
          status === "rejected" ? camille.name : null,
          status === "rejected" ? at(-ago + 2) : null,
        ],
      );
    }
  }

  // Salaries for the last three months, so the profit figures look like a business with payroll.
  for (const monthsAgo of [3, 2, 1]) {
    const date = day(-monthsAgo * 30 + 2);
    const gross = peso(185_000);
    await post(date, `Salaries, ${date.slice(0, 7)}`, "manual", null, [
      [A.salaries, gross, 0],
      [A.bank, 0, gross],
    ]);
  }

  // Last statement lines from the bank, for the reconciliation screen: a couple match the books, the rest need a decision.
  const imp = await one(
    `INSERT INTO bank_imports (bank_account_id, file_name, rows_in_file, rows_new, imported_by, imported_by_name)
     VALUES ($1,'BDO-statement-recent.csv',6,6,$2,$3) RETURNING id`,
    [bankAccount.id, camille.id, camille.name],
  );
  const statement = [
    [-3, "INWARD TRANSFER CORDILLERA LOGISTICS", 120_000, "REF-IN-9921"],
    [-4, "SERVICE CHARGE", -350, "FEE-OCT"],
    [-6, "POS PURCHASE CLOUDNINE HOSTING", -7_200, "CARD-1177"],
    [-9, "INTEREST EARNED", 412, "INT-OCT"],
    [-10, "CHECK DEPOSIT 004512", 35_000, "CHK-004512"],
    [-12, "OUTWARD TRANSFER NETSTREAM FIBER", -2_499, "REF-OUT-3310"],
  ];
  for (const [ago, description, amount, ref] of statement)
    await q(
      `INSERT INTO bank_lines (bank_account_id, import_id, line_date, description, reference, amount_minor, fingerprint)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        bankAccount.id,
        imp.id,
        day(ago),
        description,
        ref,
        peso(amount),
        hash(`mock-${ago}-${description}-${amount}`),
      ],
    );

  // Document numbers carry on from where the mock data stopped.
  for (const [key, last] of Object.entries(counters))
    await q(
      `INSERT INTO document_counters (key, last_number) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET last_number = GREATEST(document_counters.last_number, EXCLUDED.last_number)`,
      [key, last],
    );

  /* ---------------------------------------------- audit trail, notifications */
  const audit = [
    [0, "Website contact form", "lead.create", "lead", "New website enquiry from Grace Villanueva"],
    [0, camille.name, "invoice.send", "invoice", "Sent invoice to Cordillera Logistics Corp."],
    [1, marco.name, "quote.send", "quote", "Sent quote QT-2026-0101 to Kape Cordillera Roasters"],
    [
      1,
      bianca.name,
      "deal.move",
      "deal",
      "Moved Property listing portal from Proposal to Negotiation",
    ],
    [2, paolo.name, "time.submit", "time", "Submitted last week's timesheet"],
    [
      2,
      camille.name,
      "expense.approve",
      "expense",
      "Approved expense: Figma and design tool seats",
    ],
    [3, camille.name, "bill.approve", "bill", "Approved a bill from Luzon Power & Light"],
    [3, trisha.name, "task.complete", "task", "Completed Log the intro call notes"],
    [
      4,
      camille.name,
      "payment.record",
      "payment",
      "Recorded a payment from Cordillera Logistics Corp.",
    ],
    [
      5,
      marco.name,
      "meeting.create",
      "meeting",
      "Scheduled a proposal walkthrough with Kape Cordillera",
    ],
    [
      6,
      camille.name,
      "project.status",
      "project",
      "Moved Membership and class scheduling to Active",
    ],
    [7, bianca.name, "lead.qualify", "lead", "Qualified lead Vince Salazar"],
    [9, camille.name, "invoice.issue", "invoice", "Issued an invoice to Mines View Hotel & Suites"],
    [11, camille.name, "role.update", "role", "Updated permissions for Sales"],
  ];
  for (const [ago, actor, action, entity, summary] of audit)
    await q(
      `INSERT INTO audit_log (actor_name, action, entity, summary, created_at) VALUES ($1,$2,$3,$4,$5)`,
      [actor, action, entity, summary, at(-ago, 9 + ((ago * 3) % 9))],
    );
  const notices = [
    [camille, "approval", "3 time entries are waiting for approval", "/dashboard/time", 1, false],
    [
      camille,
      "finance",
      "Invoice INV-2026-0012 is overdue",
      "/dashboard/finance/invoices?state=overdue",
      2,
      false,
    ],
    [
      camille,
      "approval",
      "Expense submitted: Conference ticket",
      "/dashboard/finance/expenses?status=submitted",
      5,
      true,
    ],
    [marco, "task", "Task due today: Reply to Grace Villanueva", "/dashboard/crm/tasks", 0, false],
    [
      marco,
      "meeting",
      "Proposal walkthrough tomorrow at 10:00",
      "/dashboard/crm/schedule",
      1,
      false,
    ],
    [bianca, "lead", "New lead assigned: Ramon Aquino", "/dashboard/crm/leads", 1, true],
  ];
  for (const [who, kind, title, href, ago, read] of notices)
    await q(
      `INSERT INTO notifications (user_id, kind, title, href, read_at, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [who.id, kind, title, href, read ? at(-ago + 1) : null, at(-ago, 8 + ago)],
    );

  await q("COMMIT");
  console.log(
    "Seeded mock data: 6 staff, 12 clients, 15 deals, 9 leads, quotes, 5 projects with eight weeks of time,\n" +
      "meetings, and finance (invoices, payments, bills, expenses, payroll, a bank statement) with a balanced ledger.",
  );
} catch (error) {
  await q("ROLLBACK").catch(() => undefined);
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
