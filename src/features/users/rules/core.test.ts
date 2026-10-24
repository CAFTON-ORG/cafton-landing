import { describe, expect, it } from "vitest";

import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { checkAssignable, checkRemoval, checkRoleChange, checkTakesLeads } from "./core";

const owner = {
  email: "owner@cafton.com",
  roleKey: "owner",
  permissions: SYSTEM_ROLE_PERMISSIONS.owner,
};
const admin = {
  email: "admin@cafton.com",
  roleKey: "admin",
  permissions: SYSTEM_ROLE_PERMISSIONS.admin,
};

describe("checkAssignable", () => {
  it("lets an owner assign any role", () => {
    expect(checkAssignable(owner, SYSTEM_ROLE_PERMISSIONS.owner)).toBeNull();
  });

  it("stops an admin assigning the owner role (privilege escalation)", () => {
    expect(checkAssignable(admin, SYSTEM_ROLE_PERMISSIONS.owner)).toMatch(/more access/);
  });

  it("lets an admin assign the viewer role", () => {
    expect(checkAssignable(admin, SYSTEM_ROLE_PERMISSIONS.viewer)).toBeNull();
  });
});

describe("checkRoleChange", () => {
  const target = { email: "viewer@cafton.com", roleKey: "viewer" };

  it("allows changing someone else's role", () => {
    expect(
      checkRoleChange({ actor: admin, target, newRoleKey: "admin", ownerCount: 1 }),
    ).toBeNull();
  });

  it("blocks changing your own role, ignoring email case", () => {
    expect(
      checkRoleChange({
        actor: admin,
        target: { email: "ADMIN@cafton.com", roleKey: "admin" },
        newRoleKey: "viewer",
        ownerCount: 1,
      }),
    ).toMatch(/own role/);
  });

  it("only lets an owner change another owner", () => {
    const otherOwner = { email: "o2@cafton.com", roleKey: "owner" };
    expect(
      checkRoleChange({ actor: admin, target: otherOwner, newRoleKey: "viewer", ownerCount: 2 }),
    ).toMatch(/Only an owner/);
    expect(
      checkRoleChange({ actor: owner, target: otherOwner, newRoleKey: "viewer", ownerCount: 2 }),
    ).toBeNull();
  });

  it("never demotes the last owner", () => {
    const lastOwner = { email: "o2@cafton.com", roleKey: "owner" };
    expect(
      checkRoleChange({ actor: owner, target: lastOwner, newRoleKey: "admin", ownerCount: 1 }),
    ).toMatch(/at least one owner/);
  });
});

describe("checkRemoval", () => {
  it("blocks removing yourself", () => {
    expect(
      checkRemoval({
        actor: owner,
        target: { email: owner.email, roleKey: "owner" },
        ownerCount: 2,
      }),
    ).toMatch(/remove yourself/);
  });

  it("blocks an admin removing an owner", () => {
    expect(
      checkRemoval({
        actor: admin,
        target: { email: "o2@cafton.com", roleKey: "owner" },
        ownerCount: 2,
      }),
    ).toMatch(/Only an owner/);
  });

  it("blocks removing the last owner", () => {
    expect(
      checkRemoval({
        actor: owner,
        target: { email: "o2@cafton.com", roleKey: "owner" },
        ownerCount: 1,
      }),
    ).toMatch(/at least one owner/);
  });

  it("allows removing a pending invite (no profile yet)", () => {
    expect(checkRemoval({ actor: admin, target: null, ownerCount: 1 })).toBeNull();
  });
});

describe("checkTakesLeads", () => {
  it("allows signed-in people whose role can work on leads", () => {
    expect(checkTakesLeads({ status: "Active", canWorkLeads: true })).toBeNull();
  });

  it("refuses an invitation not yet used, and a role that can't open leads", () => {
    expect(checkTakesLeads({ status: "Invited", canWorkLeads: true })).toMatch(/signed in/);
    expect(checkTakesLeads({ status: "Active", canWorkLeads: false })).toMatch(
      /can't work on leads/,
    );
  });
});
