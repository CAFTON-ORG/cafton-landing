// Adds two projects (one in progress with a team, milestones, tasks and a week of time, one just
// planned) to a LOCAL database that already has the demo CRM data, so the Delivery screens can be
// designed and reviewed.
//
//   npm run db:local                     # terminal 1: throw-away Postgres on :5544
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres npm run db:seed-demo
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres npm run db:seed-delivery
//
// Like seed-demo it refuses to run against anything that is not localhost. Safe to run twice: it
// only seeds when there are no projects.
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || !/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  console.error("Refusing to seed: DATABASE_URL must point at localhost (use `npm run db:local`).");
  process.exit(1);
}

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
/** The Monday of the week a date falls in (matches the database check on time_entries). */
const mondayOf = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const existing = await client.query("SELECT count(*)::int AS n FROM projects");
  if (existing.rows[0].n > 0) {
    console.log("Delivery already has projects; nothing to do.");
    process.exit(0);
  }
  // The demo data has no signed-in staff, so a project needs two people to work on it: add them
  // when the database has fewer.
  let people = await client.query("SELECT id FROM profiles ORDER BY created_at LIMIT 2");
  for (const [index, staff] of [
    ["11111111-aaaa-4aaa-8aaa-111111111111", "Demo Manager"],
    ["22222222-bbbb-4bbb-8bbb-222222222222", "Demo Engineer"],
  ].entries()) {
    if (people.rows.length > index) continue;
    const [id, name] = staff;
    const email = name.toLowerCase().replace(" ", ".") + "@cafton.com";
    // No auth.users row: its sign-up trigger only lets invited emails in, and a refused insert
    // leaves the local database connection in a state the next statement trips over. A profile
    // does not need one.
    await client.query(
      `INSERT INTO profiles (id, email, full_name, role_id)
       SELECT $1, $2, $3, id FROM roles WHERE key = 'admin' ON CONFLICT DO NOTHING`,
      [id, email, name],
    );
  }
  people = await client.query("SELECT id FROM profiles ORDER BY created_at LIMIT 2");
  const deals = await client.query(
    "SELECT id, title, contact_id, organization_id FROM deals WHERE deleted_at IS NULL ORDER BY created_at LIMIT 2",
  );
  if (people.rows.length < 1 || deals.rows.length < 2) {
    console.error("No staff or deals found. Run `npm run db:seed-demo` first.");
    process.exit(1);
  }
  const [manager, other] = [people.rows[0].id, (people.rows[1] ?? people.rows[0]).id];
  await client.query("BEGIN");

  const insertProject = async (deal, fields) =>
    (
      await client.query(
        `INSERT INTO projects (name, description, deal_id, contact_id, organization_id, status, manager_id,
                               start_date, due_date, budget_minor, budget_minutes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now()) RETURNING id`,
        [
          fields.name,
          fields.description,
          deal.id,
          deal.contact_id,
          deal.organization_id,
          fields.status,
          manager,
          fields.start,
          fields.due,
          fields.budget,
          fields.minutes,
        ],
      )
    ).rows[0].id;

  const running = await insertProject(deals.rows[0], {
    name: deals.rows[0].title,
    description: "Build and launch, with a pilot at one branch first.",
    status: "active",
    start: day(-21),
    due: day(35),
    budget: 38_000_000,
    minutes: 400 * 60,
  });
  await insertProject(deals.rows[1], {
    name: deals.rows[1].title,
    description: "Waiting on the signed agreement.",
    status: "planned",
    start: null,
    due: day(90),
    budget: 12_000_000,
    minutes: null,
  });

  await client.query(
    `INSERT INTO project_members (project_id, profile_id, cost_rate_minor)
     VALUES ($1, $2, 45000), ($1, $3, 35000) ON CONFLICT DO NOTHING`,
    [running, manager, other],
  );

  const milestones = await client.query(
    `INSERT INTO milestones (project_id, name, description, due_date, status, position, billable, amount_minor, completed_at, updated_at)
     VALUES
       ($1, 'Design signed off', 'Screens and flows agreed with the client.', $2, 'done', 0, true, 11400000, now(), now()),
       ($1, 'Pilot at one branch', 'Run it for two weeks with real orders.', $3, 'in_progress', 1, true, 15200000, NULL, now()),
       ($1, 'Roll-out', 'Every branch live, staff trained.', $4, 'pending', 2, true, 11400000, NULL, now())
     RETURNING id`,
    [running, day(-7), day(14), day(35)],
  );
  const [designed, pilot] = milestones.rows.map((row) => row.id);

  const task = (title, status, priority, assignee, milestone, dueOffset, position, estimate) => [
    running,
    milestone,
    title,
    status,
    priority,
    assignee,
    dueOffset === null ? null : day(dueOffset),
    estimate,
    position,
    status === "done" ? new Date().toISOString() : null,
  ];
  const tasks = [
    task("Wireframes for ordering", "done", "normal", other, designed, -12, 0, 8 * 60),
    task("Visual design", "done", "normal", other, designed, -8, 1, 16 * 60),
    task("Menu and stock data model", "in_progress", "high", manager, pilot, 3, 0, 12 * 60),
    task("Ordering screen", "in_progress", "normal", other, pilot, 6, 1, 20 * 60),
    task("Branch printer integration", "review", "normal", manager, pilot, 8, 0, 10 * 60),
    task("Pilot training session", "todo", "low", manager, pilot, 12, 0, 4 * 60),
    task("Daily stock report", "todo", "normal", other, null, -2, 1, 6 * 60),
  ];
  for (const values of tasks) {
    await client.query(
      `INSERT INTO project_tasks (project_id, milestone_id, title, status, priority, assignee_id, due_date,
                                  estimate_minutes, position, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      values,
    );
  }

  // Last week approved, this week still drafts: a believable timesheet and utilisation report.
  const entries = [];
  for (const [dayOffset, minutes, who] of [
    [-9, 480, manager],
    [-8, 450, manager],
    [-7, 420, other],
    [-6, 360, other],
    [-2, 240, manager],
    [-1, 300, other],
  ]) {
    const workDate = day(dayOffset);
    const week = mondayOf(workDate);
    const approved = dayOffset <= -6;
    entries.push([running, who, workDate, week, minutes, approved ? "approved" : "draft"]);
  }
  for (const [project, who, workDate, week, minutes, status] of entries) {
    const approved = status === "approved";
    await client.query(
      `INSERT INTO time_entries (project_id, profile_id, work_date, week_start, minutes, status, note, updated_at,
                                 reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6::time_entry_status, 'Seeded for the design review', now(), $7::uuid, $8::timestamptz)`,
      [
        project,
        who,
        workDate,
        week,
        minutes,
        status,
        approved ? (who === manager ? other : manager) : null,
        approved ? new Date().toISOString() : null,
      ],
    );
  }

  await client.query("COMMIT");
  console.log("Seeded 2 projects, 3 milestones, 7 tasks and 6 time entries.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
