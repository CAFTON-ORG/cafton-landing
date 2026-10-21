"use client";

import { Field } from "@/components/dashboard/shared/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import type { AuthorOption } from "../admin/types";

export function AuthorField({
  id,
  label,
  value,
  onChange,
  authors,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  authors: AuthorOption[];
  error?: string;
}) {
  return (
    <Field id={id} label={label} required error={error}>
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue>
            {(current: string) =>
              authors.find((author) => author.id === current)?.name ?? "Choose an author"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {authors.map((author) => (
            <SelectItem key={author.id} value={author.id}>
              {author.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
