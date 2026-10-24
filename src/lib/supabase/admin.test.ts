import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

/** Every non-test source file under src/, with its path inside src/ using forward slashes. */
function sourceFiles(dir = ROOT): { path: string; name: string; source: string }[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return [
      {
        path,
        name: relative(ROOT, path).split(sep).join("/"),
        source: readFileSync(path, "utf8"),
      },
    ];
  });
}

describe("the service-role key", () => {
  it("is never given a NEXT_PUBLIC_ name, which would put it in the browser bundle", () => {
    for (const file of sourceFiles()) {
      expect(file.source, file.name).not.toMatch(/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/);
    }
    expect(readFileSync(join(process.cwd(), ".env.example"), "utf8")).not.toMatch(
      /NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/,
    );
  });

  it("is read in one place only, which is server-only", () => {
    const readers = sourceFiles().filter((file) =>
      /\benv\.SUPABASE_SERVICE_ROLE_KEY|process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(file.source),
    );
    expect(readers.map((file) => file.name)).toEqual(["lib/supabase/admin.ts"]);
    expect(readers[0].source).toMatch(/^import "server-only";/);
  });

  it("is imported only by server code: actions and route handlers, never a component", () => {
    const importers = sourceFiles().filter((file) =>
      /from "@\/lib\/supabase\/admin"/.test(file.source),
    );
    expect(importers.length).toBeGreaterThan(0);
    for (const file of importers) {
      expect(file.name, "a component can't import the admin client").not.toMatch(/\.tsx$/);
      expect(file.source, file.name).not.toMatch(/^"use client"/m);
    }
  });
});
