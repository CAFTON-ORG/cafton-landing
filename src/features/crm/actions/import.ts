"use server";

import { z } from "zod";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { can } from "@/lib/auth/dal";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { IMPORT_LIMIT, mapContacts, mapOrganizations, type RowProblem } from "../rules/import";
import { live } from "../repository/mappers";
import { guard, refreshCrm } from "./guard";

export interface ImportReport {
  /** True when nothing was written: this is the preview. */
  preview: boolean;
  total: number;
  created: number;
  /** Rows skipped because the record already exists (or repeats earlier in the file). */
  existing: number;
  /** Organizations made on the way, for contacts that name a new company. */
  organizationsCreated: number;
  problems: RowProblem[];
  /** The columns that were understood, for the person to check. */
  understood: string[];
}

const schema = z.object({
  kind: z.enum(["contacts", "organizations"]),
  csv: z.string().max(2_000_000, "That file is too large (2 MB at most)."),
  /** Preview first: nothing is written until it is false. */
  dryRun: z.boolean(),
});

/** Reads a CSV of contacts or organizations; with `dryRun` it only says what would happen. */
export async function importCsv(
  input: z.input<typeof schema>,
): Promise<ActionResult<ImportReport>> {
  return runAction(async () => {
    const data = parse(schema, input);
    const actor = await guard(
      data.kind === "contacts" ? "contacts:create" : "organizations:create",
    );
    const table = parseCsv(data.csv);
    if (table.length < 2)
      throw new ActionError("The file has no rows. The first line must be the column titles.");
    if (table.length - 1 > IMPORT_LIMIT) {
      throw new ActionError(
        `That file has ${table.length - 1} rows. Import ${IMPORT_LIMIT} or fewer at a time.`,
      );
    }

    const total = table.length - 1;
    const by = actorId(actor);

    if (data.kind === "organizations") {
      const mapped = mapOrganizations(table);
      const names = await prisma.organization.findMany({ where: live, select: { name: true } });
      const have = new Set(names.map((row) => row.name.toLowerCase()));
      const fresh = mapped.rows.filter((row) => {
        const key = row.name.toLowerCase();
        if (have.has(key)) return false;
        have.add(key);
        return true;
      });
      const report: ImportReport = {
        preview: data.dryRun,
        total,
        created: fresh.length,
        existing: mapped.rows.length - fresh.length,
        organizationsCreated: 0,
        problems: mapped.problems.slice(0, 50),
        understood: mapped.understood,
      };
      if (!data.dryRun && fresh.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.organization.createMany({
            data: fresh.map((row) => ({
              name: row.name,
              industry: row.industry,
              size: row.size,
              website: row.website,
              phone: row.phone,
              address: row.address,
              tags: row.tags,
              createdBy: by,
              updatedBy: by,
            })),
          });
          await recordAudit(
            actor,
            {
              action: "organization.import",
              entity: "organization",
              summary: `Imported ${fresh.length} organizations from a CSV file`,
            },
            tx,
          );
        });
        refreshCrm();
      }
      return report;
    }

    const mapped = mapContacts(table);
    const existingEmails = new Set(
      (await prisma.contact.findMany({ where: live, select: { email: true } })).map((row) =>
        row.email.toLowerCase(),
      ),
    );
    const fresh = mapped.rows.filter((row) => {
      if (existingEmails.has(row.email)) return false;
      existingEmails.add(row.email);
      return true;
    });

    const orgs = await prisma.organization.findMany({
      where: live,
      select: { id: true, name: true },
    });
    const orgByName = new Map(orgs.map((org) => [org.name.toLowerCase(), org.id]));
    const mayMakeOrgs = can(actor, "organizations:create");
    const newOrgNames = new Map<string, string>();
    for (const row of fresh) {
      const key = row.organization?.toLowerCase();
      if (key && !orgByName.has(key) && mayMakeOrgs) newOrgNames.set(key, row.organization!);
    }

    const report: ImportReport = {
      preview: data.dryRun,
      total,
      created: fresh.length,
      existing: mapped.rows.length - fresh.length,
      organizationsCreated: newOrgNames.size,
      problems: mapped.problems.slice(0, 50),
      understood: mapped.understood,
    };
    if (data.dryRun || fresh.length === 0) return report;

    await prisma.$transaction(async (tx) => {
      for (const [key, name] of newOrgNames) {
        const org = await tx.organization.create({ data: { name, createdBy: by, updatedBy: by } });
        orgByName.set(key, org.id);
      }
      await tx.contact.createMany({
        data: fresh.map((row) => ({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          position: row.position,
          organizationId: row.organization
            ? orgByName.get(row.organization.toLowerCase())
            : undefined,
          tags: row.tags,
          source: "import",
          createdBy: by,
          updatedBy: by,
        })),
      });
      await recordAudit(
        actor,
        {
          action: "contact.import",
          entity: "contact",
          summary: `Imported ${fresh.length} contacts from a CSV file`,
        },
        tx,
      );
    });
    refreshCrm();
    return report;
  });
}
