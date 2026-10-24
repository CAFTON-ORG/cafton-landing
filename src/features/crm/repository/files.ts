import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { FileSubject } from "../rules/files";
import type { FileView } from "../types";

/** The database filter for one record's files. */
export const filesWhere = (subject: FileSubject): Prisma.RecordFileWhereInput => ({
  ...(subject.leadId ? { leadId: subject.leadId } : {}),
  ...(subject.contactId ? { contactId: subject.contactId } : {}),
  ...(subject.organizationId ? { organizationId: subject.organizationId } : {}),
  ...(subject.dealId ? { dealId: subject.dealId } : {}),
});

/** A record's files, newest first. */
export async function listFiles(subject: FileSubject): Promise<FileView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.recordFile.findMany({
    where: filesWhere(subject),
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    uploadedByName: row.uploadedByName,
    uploadedBy: row.uploadedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }));
}
