import { z } from "zod";

export const emailSchema = z
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const inviteSchema = z.object({
  email: emailSchema,
  roleId: z.string().min(1, "Choose a role."),
});

export type InviteInput = z.input<typeof inviteSchema>;
