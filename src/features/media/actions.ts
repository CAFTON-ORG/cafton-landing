"use server";

import { revalidatePath } from "next/cache";

import { ActionError, NOT_CONFIGURED, actorId, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/env.public";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MEDIA_BUCKET, newMediaPath } from "@/lib/media";
import { ImageRejected, sanitizeImage } from "@/lib/security/image";
import { createClient } from "@/lib/supabase/server";
import { getMedia } from "./repository";
import { checkAltText, checkDeleteMedia } from "./rules";
import type { MediaItem } from "./types";

async function guard(permission: Permission) {
  const staff = await requirePermission(permission);
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

function refresh() {
  revalidatePath("/dashboard/content/media");
}

/**
 * Uploads one image (the browser calls this once per file). The file is checked by its
 * bytes, re-encoded without metadata, size-capped and given a random name before it
 * touches Storage; nothing the uploader typed becomes part of a path.
 */
export async function uploadMedia(formData: FormData): Promise<ActionResult<MediaItem>> {
  return runAction(async () => {
    const actor = await guard("content:create");
    if (!isSupabaseConfigured) {
      throw new ActionError(
        "Image storage isn't set up yet. Add the Supabase environment variables to turn uploads on.",
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ActionError("Choose an image to upload.");
    if (file.size > MAX_UPLOAD_BYTES)
      throw new ActionError(`${file.name} is larger than 4 MB. Resize it and try again.`);
    if (file.type && !(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      throw new ActionError(`${file.name} isn't a JPG, PNG or WebP image.`);
    }

    let clean;
    try {
      clean = await sanitizeImage(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof ImageRejected) throw new ActionError(`${file.name}: ${error.message}`);
      throw error;
    }

    const path = newMediaPath(clean.extension);
    const storage = (await createClient()).storage.from(MEDIA_BUCKET);
    const { error } = await storage.upload(path, clean.data, {
      contentType: clean.mime,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.error("Storage upload failed", error);
      throw new ActionError("Couldn't store the image. Check your connection and try again.");
    }

    const name = file.name.replace(/[\\/]/g, "_").slice(0, 200) || "image";
    let row;
    try {
      row = await prisma.$transaction(async (tx) => {
        const created = await tx.media.create({
          data: {
            path,
            name,
            mime: clean.mime,
            sizeBytes: clean.data.length,
            width: clean.width,
            height: clean.height,
            uploadedById: actorId(actor),
          },
        });
        await recordAudit(
          actor,
          {
            action: "media.upload",
            entity: "media",
            entityId: created.id,
            summary: `Uploaded the image ${name}`,
          },
          tx,
        );
        return created;
      });
    } catch (dbError) {
      await storage.remove([path]); // never leave a file the library cannot see
      throw dbError;
    }

    refresh();
    return (await getMedia(row.id))!;
  });
}

/** The description offered whenever this image is picked. Each use can still override it. */
export async function updateMediaAlt(id: string, alt: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("content:update");
    const blocked = checkAltText(alt);
    if (blocked) throw new ActionError(blocked, "validation", { alt: blocked });

    await prisma.$transaction(async (tx) => {
      const found = await tx.media.findUnique({ where: { id } });
      if (!found) throw new ActionError("That image no longer exists.");
      await tx.media.update({ where: { id }, data: { alt: alt.trim() } });
      await recordAudit(
        actor,
        {
          action: "media.update",
          entity: "media",
          entityId: id,
          summary: `Described the image ${found.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Removes an image from Storage and the library. Refused while any content still uses it. */
export async function deleteMedia(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("content:delete");
    const item = await getMedia(id);
    if (!item) throw new ActionError("That image no longer exists.");
    const blocked = checkDeleteMedia(item);
    if (blocked) throw new ActionError(blocked, "rule");

    if (isSupabaseConfigured) {
      const { error } = await (await createClient()).storage.from(MEDIA_BUCKET).remove([item.path]);
      if (error) {
        console.error("Storage delete failed", error);
        throw new ActionError("Couldn't remove the file from storage. Try again.");
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.media.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "media.delete",
          entity: "media",
          entityId: id,
          summary: `Deleted the image ${item.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Recent images (optionally filtered) for the picker dialog in the content editors. */
export async function listMediaForPicker(query = ""): Promise<ActionResult<MediaItem[]>> {
  return runAction(async () => {
    await guard("content:view");
    const { listMedia } = await import("./repository");
    return (await listMedia({ q: query, pageSize: 60 })).items;
  });
}
