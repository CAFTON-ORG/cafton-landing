import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  canGrantAll,
  hasPermission,
  isPermission,
  normalisePermissions,
  resolvePermissions,
} from "./permissions";

describe("permission catalogue", () => {
  it("uses resource:action strings with no duplicates", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    for (const permission of ALL_PERMISSIONS) expect(permission).toMatch(/^[a-z]+:[a-z]+$/);
  });

  it("recognises only catalogued permissions", () => {
    expect(isPermission("users:invite")).toBe(true);
    expect(isPermission("users:fly")).toBe(false);
  });
});

describe("built-in roles", () => {
  it("gives the owner everything", () => {
    expect(SYSTEM_ROLE_PERMISSIONS.owner).toEqual(ALL_PERMISSIONS);
  });

  it("keeps owners:manage away from admins", () => {
    expect(hasPermission(SYSTEM_ROLE_PERMISSIONS.admin, "owners:manage")).toBe(false);
    expect(hasPermission(SYSTEM_ROLE_PERMISSIONS.admin, "users:invite")).toBe(true);
  });

  it("makes viewers read-only and hides people, roles and audit", () => {
    const viewer = SYSTEM_ROLE_PERMISSIONS.viewer;
    expect(viewer.every((permission) => permission.endsWith(":view"))).toBe(true);
    expect(viewer).not.toContain("users:view");
    expect(viewer).not.toContain("roles:view");
    expect(viewer).not.toContain("audit:view");
  });
});

describe("website content permissions", () => {
  it("lets an editor write and publish but never delete, and gives them nothing else", () => {
    const editor = SYSTEM_ROLE_PERMISSIONS.editor;
    expect(editor).toEqual(
      expect.arrayContaining([
        "content:view",
        "content:create",
        "content:update",
        "content:publish",
      ]),
    );
    expect(editor).not.toContain("content:delete");
    expect(editor.every((permission) => permission.startsWith("content:"))).toBe(true);
  });

  it("keeps sales and viewers from changing the website", () => {
    for (const role of ["sales", "viewer"] as const) {
      const writes = SYSTEM_ROLE_PERMISSIONS[role].filter(
        (p) => p.startsWith("content:") && p !== "content:view",
      );
      expect(writes, role).toEqual([]);
      expect(SYSTEM_ROLE_PERMISSIONS[role]).toContain("content:view");
    }
  });

  it("gives admins everything about content, including delete", () => {
    expect(SYSTEM_ROLE_PERMISSIONS.admin).toContain("content:delete");
  });
});

describe("canGrantAll", () => {
  it("allows granting a subset and refuses anything you do not hold", () => {
    expect(canGrantAll(SYSTEM_ROLE_PERMISSIONS.admin, ["users:view"])).toBe(true);
    expect(canGrantAll(SYSTEM_ROLE_PERMISSIONS.admin, ["users:view", "owners:manage"])).toBe(false);
  });
});

describe("normalisePermissions", () => {
  it("drops unknown values and adds the matching view permission", () => {
    expect(normalisePermissions(["users:invite", "nope:nope"]).sort()).toEqual([
      "users:invite",
      "users:view",
    ]);
  });
});

describe("resolvePermissions", () => {
  it("reads system roles from code and custom roles from stored rows", () => {
    expect(resolvePermissions({ key: "viewer", isSystem: true, permissions: [] })).toEqual(
      SYSTEM_ROLE_PERMISSIONS.viewer,
    );
    expect(
      resolvePermissions({
        key: "custom",
        isSystem: false,
        permissions: [{ permission: "users:view" }, { permission: "bogus:thing" }],
      }),
    ).toEqual(["users:view"]);
  });
});
