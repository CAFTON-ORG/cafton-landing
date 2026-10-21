import type { ZodType } from "zod";

import { toFieldErrors } from "@/lib/forms";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };

export const NOT_CONFIGURED =
  "The database isn't connected yet. Add DATABASE_URL to .env.local (see .env.example).";

/** An error whose message is safe to show to the user. */
export class ActionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Thrown when the signed-in staff member lacks a permission. */
export class ForbiddenError extends Error {
  constructor() {
    super("You don't have permission to do that.");
  }
}

/**
 * Wraps a Server Action body: known errors become a typed result the UI can
 * show; anything unexpected is logged and reported generically.
 */
export async function runAction<T = void>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: error.message };
    if (error instanceof ActionError) {
      return { ok: false, error: error.message, code: error.code, fieldErrors: error.fieldErrors };
    }
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ActionError(
      result.error.issues[0]?.message ?? "Invalid input.",
      "validation",
      toFieldErrors(result.error.issues),
    );
  }
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Staff ids are Supabase user UUIDs; the development preview user has none. */
export function actorId(staff: { id: string }) {
  return UUID.test(staff.id) ? staff.id : null;
}
