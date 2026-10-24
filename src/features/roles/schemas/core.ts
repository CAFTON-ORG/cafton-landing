import { z } from "zod";

export const roleSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Give the role a name.")
    .max(60, "Keep the name under 60 characters."),
  description: z.string().trim().max(200, "Keep the description under 200 characters.").optional(),
  permissions: z.array(z.string()).min(1, "Choose at least one permission."),
});

export type RoleInput = z.input<typeof roleSchema>;
