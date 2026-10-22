import type { Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/actions";

/**
 * Staff appear as authors without anyone maintaining a second list: choosing a person
 * creates (or refreshes) an `Author` row from their profile, with an id derived from
 * the profile id. Authors that are not staff (only the bundled fallback one) are never offered.
 */
export const STAFF_AUTHOR_PREFIX = "staff-";
/** The byline subtitle for staff: people read this on the public site, so no internal role names. */
export const STAFF_AUTHOR_ROLE = "Software development";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const staffAuthorId = (profileId: string) => `${STAFF_AUTHOR_PREFIX}${profileId}`;

export function profileIdOf(authorId: string): string | null {
  if (!authorId.startsWith(STAFF_AUTHOR_PREFIX)) return null;
  const id = authorId.slice(STAFF_AUTHOR_PREFIX.length);
  return UUID.test(id) ? id : null;
}

export function displayName(profile: { fullName: string | null; email: string }) {
  return profile.fullName?.trim() || profile.email.split("@")[0];
}

type Db = Pick<Prisma.TransactionClient, "author" | "profile">;

/** Makes sure the chosen author exists; a staff author is created or refreshed from the profile. */
export async function ensureAuthor(tx: Db, authorId: string): Promise<void> {
  const profileId = profileIdOf(authorId);
  if (profileId) {
    const profile = await tx.profile.findUnique({ where: { id: profileId } });
    if (profile) {
      const fields = {
        name: displayName(profile),
        role: STAFF_AUTHOR_ROLE,
        avatar: profile.avatarUrl,
      };
      await tx.author.upsert({
        where: { id: authorId },
        create: { id: authorId, kind: "person", ...fields },
        update: fields,
      });
      return;
    }
  }
  const author = await tx.author.findUnique({ where: { id: authorId }, select: { id: true } });
  if (!author)
    throw new ActionError("Choose who made it.", "validation", {
      authorId: "That author no longer exists.",
    });
}
