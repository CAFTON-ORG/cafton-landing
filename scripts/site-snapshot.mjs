// Proves the public site did not change. After `npm run build`:
//
//   npm run snapshot:save  -- before     # remember what every prerendered page looks like
//   ...make changes, npm run build...
//   npm run snapshot:check -- before     # fails and lists any page whose markup changed
//
// It compares the prerendered HTML of every static page, ignoring what legitimately varies
// between builds (hashed asset names, framework scripts, generated element ids) and the order
// of class names (formatting tools reorder them; the rendered result is the same). A real
// change to text, structure, attributes or the set of classes is reported.
//
// Snapshots live in .snapshots/ (git-ignored).
import fs from "node:fs";
import path from "node:path";

const [mode, name = "baseline"] = process.argv.slice(2);
const APP = path.join(".next", "server", "app");
const SNAP = path.join(".snapshots", name);

if (!["save", "check"].includes(mode)) {
  console.error("Usage: node scripts/site-snapshot.mjs <save|check> [name]");
  process.exit(2);
}
if (!fs.existsSync(APP)) {
  console.error("No build found. Run `npm run build` first.");
  process.exit(2);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

function normalise(html) {
  return (
    html
      .replace(/<script\b[\s\S]*?<\/script>/g, "")
      .replace(/<link\b[^>]*>/g, "")
      // Next injects this size hint at a position that varies between builds.
      .replace(/<meta name="next-size-adjust"[^>]*>/g, "")
      .replace(/\/_next\/static\/[^"')\s]*/g, "")
      .replace(/data-dpl-id="[^"]*"/g, "")
      .replace(/class="([^"]*)"/g, (_, value) => `class="${value.split(/\s+/).sort().join(" ")}"`)
      .replace(/radix-_R_[a-z0-9_]+_/gi, "radix-ID")
      .replace(/></g, ">\n<")
  );
}

const current = new Map(
  htmlFiles(APP).map((file) => [
    path.relative(APP, file),
    normalise(fs.readFileSync(file, "utf8")),
  ]),
);

if (mode === "save") {
  fs.rmSync(SNAP, { recursive: true, force: true });
  for (const [rel, body] of current) {
    fs.mkdirSync(path.dirname(path.join(SNAP, rel)), { recursive: true });
    fs.writeFileSync(path.join(SNAP, rel), body);
  }
  console.log(`Saved ${current.size} pages to ${SNAP}`);
  process.exit(0);
}

if (!fs.existsSync(SNAP)) {
  console.error(`No snapshot named "${name}". Run: npm run snapshot:save -- ${name}`);
  process.exit(2);
}

const saved = new Map(
  htmlFiles(SNAP).map((file) => [path.relative(SNAP, file), fs.readFileSync(file, "utf8")]),
);
let changed = 0;
for (const rel of new Set([...saved.keys(), ...current.keys()])) {
  if (!saved.has(rel)) {
    console.log(`NEW     ${rel}`);
    changed++;
  } else if (!current.has(rel)) {
    console.log(`MISSING ${rel}`);
    changed++;
  } else if (saved.get(rel) !== current.get(rel)) {
    const a = new Set(saved.get(rel).split("\n"));
    const b = new Set(current.get(rel).split("\n"));
    const removed = [...a].filter((line) => !b.has(line));
    const added = [...b].filter((line) => !a.has(line));
    console.log(`CHANGED ${rel}: -${removed.length} +${added.length}`);
    for (const line of removed.slice(0, 3)) console.log(`   - ${line.slice(0, 140)}`);
    for (const line of added.slice(0, 3)) console.log(`   + ${line.slice(0, 140)}`);
    changed++;
  }
}
console.log(
  changed === 0
    ? `All ${current.size} pages match "${name}".`
    : `${changed} page(s) differ from "${name}".`,
);
process.exit(changed === 0 ? 0 : 1);
