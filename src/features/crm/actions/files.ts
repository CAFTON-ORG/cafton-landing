"use server";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { can } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { ImageRejected, sanitizeImage } from "@/lib/security/image";
import { createAdminClient, isAdminStorageConfigured } from "@/lib/supabase/admin";
import {
  CRM_FILES_BUCKET,
  checkDeleteFile,
  checkFileUpload,
  detectFileType,
  filePermission,
  newFilePath,
  sanitizeFileName,
  type FileSubject,
} from "../rules/files";
import { fileSubjectSchema } from "../schemas";
import { filesWhere } from "../repository/files";
import type { FileView } from "../types";
import { guard, refreshCrm } from "./guard";
import { assertSubjectExists, logActivity } from "./shared";

const entityOf = (subject: FileSubject) =>
  subject.dealId
    ? "deal"
    : subject.leadId
      ? "lead"
      : subject.organizationId
        ? "organization"
        : "contact";

const idOf = (subject: FileSubject) =>
  (subject.dealId ?? subject.leadId ?? subject.organizationId ?? subject.contactId)!;

/** A timeline entry, where the record has a timeline (organizations don't). */
const timelineOf = (subject: FileSubject) =>
  subject.organizationId
    ? null
    : { leadId: subject.leadId, contactId: subject.contactId, dealId: subject.dealId };

/**
 * Adds one file to a lead, contact, organization or deal (the browser calls this once per file).
 * The file is checked by its bytes, images are re-encoded without metadata, and it is stored under
 * a random name in a private bucket: nothing the uploader typed becomes part of a path.
 */
export async function uploadRecordFile(formData: FormData): Promise<ActionResult<FileView>> {
  return runAction(async () => {
    const subject: FileSubject = parse(fileSubjectSchema, {
      leadId: formData.get("leadId") || undefined,
      contactId: formData.get("contactId") || undefined,
      organizationId: formData.get("organizationId") || undefined,
      dealId: formData.get("dealId") || undefined,
    });
    const actor = await guard(filePermission(subject, "update"));
    if (!isAdminStorageConfigured) {
      throw new ActionError(
        "File storage isn't set up yet. Add the Supabase environment variables, including SUPABASE_SERVICE_ROLE_KEY, to turn uploads on.",
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ActionError("Choose a file to upload.");
    const existing = await prisma.recordFile.count({ where: filesWhere(subject) });
    const refused = checkFileUpload(file, existing);
    if (refused) throw new ActionError(refused, "rule", { file: refused });

    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectFileType(file.name, bytes);
    if (!detected.ok) throw new ActionError(`${file.name}: ${detected.reason}`, "rule");

    let data: Buffer = bytes;
    let { mime, ext } = detected.type;
    if (detected.type.kind === "image") {
      try {
        const clean = await sanitizeImage(bytes);
        data = clean.data;
        mime = clean.mime;
        ext = clean.extension;
      } catch (error) {
        if (error instanceof ImageRejected) throw new ActionError(`${file.name}: ${error.message}`);
        throw error;
      }
    }

    const path = newFilePath(ext);
    const storage = createAdminClient().storage.from(CRM_FILES_BUCKET);
    const { error } = await storage.upload(path, data, {
      contentType: mime,
      cacheControl: "0",
      upsert: false,
    });
    if (error) {
      console.error("CRM file upload failed", error);
      throw new ActionError("Couldn't store the file. Check your connection and try again.");
    }

    const name = sanitizeFileName(file.name);
    let row;
    try {
      row = await prisma.$transaction(async (tx) => {
        await assertSubjectExists(tx, subject);
        const created = await tx.recordFile.create({
          data: {
            ...subject,
            path,
            name,
            mime,
            sizeBytes: data.length,
            uploadedBy: actorId(actor),
            uploadedByName: actor.name,
          },
        });
        const timeline = timelineOf(subject);
        if (timeline)
          await logActivity(tx, actor, timeline as never, "system", `Added the file ${name}`);
        await recordAudit(
          actor,
          {
            action: "file.add",
            entity: entityOf(subject),
            entityId: idOf(subject),
            summary: `Added the file ${name}`,
          },
          tx,
        );
        return created;
      });
    } catch (dbError) {
      await storage.remove([path]); // never leave a file no record can see
      throw dbError;
    }

    refreshCrm();
    return {
      id: row.id,
      name: row.name,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
      uploadedByName: row.uploadedByName,
      uploadedBy: row.uploadedBy ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

/** Removes a file: the person who added it, or an administrator. */
export async function deleteRecordFile(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const found = await prisma.recordFile.findUnique({ where: { id } });
    if (!found) throw new ActionError("That file no longer exists.");
    const subject: FileSubject = {
      leadId: found.leadId ?? undefined,
      contactId: found.contactId ?? undefined,
      organizationId: found.organizationId ?? undefined,
      dealId: found.dealId ?? undefined,
    };
    const actor = await guard(filePermission(subject, "update"));
    const blocked = checkDeleteFile({
      uploadedBy: found.uploadedBy,
      actorId: actorId(actor),
      canAdminister: can(actor, "users:update"),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    // The stored object first: if that fails the file is still listed and can be removed again.
    const storage = createAdminClient().storage.from(CRM_FILES_BUCKET);
    const { error } = await storage.remove([found.path]);
    if (error) {
      console.error("CRM file removal failed", error);
      throw new ActionError("Couldn't remove the file from storage. Please try again.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.recordFile.delete({ where: { id } });
      const timeline = timelineOf(subject);
      if (timeline)
        await logActivity(tx, actor, timeline as never, "system", `Removed the file ${found.name}`);
      await recordAudit(
        actor,
        {
          action: "file.remove",
          entity: entityOf(subject),
          entityId: idOf(subject),
          summary: `Removed the file ${found.name}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
