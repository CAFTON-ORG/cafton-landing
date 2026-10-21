import { describe, expect, it } from "vitest";

import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { checkDeletable, checkEditable, checkGrantable, slugifyRoleName } from "./rules";

describe("slugifyRoleName", () => {
  it("makes a stable key", () => {
    expect(slugifyRoleName("  Sales & Marketing Lead ")).toBe("sales-marketing-lead");
  });
});

describe("checkGrantable", () => {
  it("blocks granting what you do not hold", () => {
    expect(checkGrantable(SYSTEM_ROLE_PERMISSIONS.admin, ["owners:manage"])).toMatch(/don't have/);
    expect(checkGrantable(SYSTEM_ROLE_PERMISSIONS.admin, ["users:view"])).toBeNull();
  });
});

describe("checkEditable / checkDeletable", () => {
  it("protects built-in roles", () => {
    expect(checkEditable({ isSystem: true })).toMatch(/Built-in/);
    expect(checkDeletable({ isSystem: true, people: 0 })).toMatch(/Built-in/);
  });

  it("refuses to delete a role in use, with a readable count", () => {
    expect(checkDeletable({ isSystem: false, people: 1 })).toBe("1 person has this role. Reassign them first.");
    expect(checkDeletable({ isSystem: false, people: 3 })).toBe("3 people have this role. Reassign them first.");
    expect(checkDeletable({ isSystem: false, people: 0 })).toBeNull();
  });
});
