import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The one layout every feature follows (ADR 0024). This test fails when a feature drifts, so the
 * structure stays the same everywhere and the server layers can be lifted out into an API later.
 */
const root = __dirname;
const features = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name);

/** Every layer is a folder, with files named by area (`core.ts` for the main one). */
const LAYER_FOLDERS = ["actions", "repository", "services", "types", "schemas", "rules"];
/** Named extras a feature may have. `content`, `lib` and `site` belong to the website content (cms). */
const EXTRAS = ["components", "pdf", "content", "lib", "site"];

const sub = (feature: string) => fs.readdirSync(path.join(root, feature), { withFileTypes: true });
const isTest = (name: string) => /\.test\.tsx?$/.test(name);

describe.each(features)("feature layout: %s", (feature) => {
  const entries = sub(feature);
  const names = entries.map((entry) => entry.name);

  it("keeps every layer in a folder, not a single file", () => {
    for (const layer of LAYER_FOLDERS) {
      expect(names, `${feature}/${layer}.ts should be ${layer}/<area>.ts`).not.toContain(
        `${layer}.ts`,
      );
    }
    for (const entry of entries) {
      expect(entry.name, `${feature}/${entry.name}: put it in repository/`).not.toMatch(
        /-repository\.ts$/,
      );
      expect(entry.name, `${feature}/${entry.name}: put it in schemas/`).not.toMatch(
        /-schemas\.ts$/,
      );
      expect(entry.name, `${feature}/${entry.name}: put it in types/`).not.toMatch(/-types\.ts$/);
    }
  });

  it("holds only the standard parts at its root", () => {
    const allowed = new Set([...LAYER_FOLDERS, ...EXTRAS]);
    const stray = names.filter((name) => !allowed.has(name) && !isTest(name));
    expect(stray, `${feature} has files outside the standard layout`).toEqual([]);
  });

  it("marks repository and services as server-only, and actions as server actions", () => {
    const filesIn = (folder: string) => {
      const dir = path.join(root, feature, folder);
      return fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((name) => /\.tsx?$/.test(name) && !isTest(name))
        : [];
    };
    for (const folder of ["repository", "services"])
      for (const file of filesIn(folder)) {
        const text = fs.readFileSync(path.join(root, feature, folder, file), "utf8");
        expect(text, `${feature}/${folder}/${file} must import "server-only"`).toContain(
          '"server-only"',
        );
      }
    // Helpers inside actions/ (guards, shared pieces) are not themselves actions.
    const helpers = new Set(["guard.ts", "shared.ts"]);
    for (const file of filesIn("actions").filter((name) => !helpers.has(name))) {
      const text = fs.readFileSync(path.join(root, feature, "actions", file), "utf8");
      expect(text, `${feature}/actions/${file} must be a "use server" file`).toContain(
        '"use server"',
      );
    }
  });
});
