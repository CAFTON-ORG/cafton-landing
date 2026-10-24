# actions/

`"use server"` files, one per area (`orders.ts`, `payments.ts`). Keep them thin: `requirePermission()`, parse with the Zod schema, call a service or repository, write the audit entry, `revalidatePath`. A helper that is not itself an action (a guard, shared pieces) may live here as `guard.ts` or `shared.ts`.
