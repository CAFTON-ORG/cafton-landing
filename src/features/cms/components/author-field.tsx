"use client";

import { Field } from "@/components/dashboard/shared/field";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
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
            {(current: string) => {
              const author = authors.find((option) => option.id === current);
              return author ? (
                <span className="flex items-center gap-2">
                  <UserAvatar name={author.name} src={author.avatar} size="sm" />
                  {author.name}
                </span>
              ) : (
                "Choose an author"
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {authors.map((author) => (
            <SelectItem key={author.id} value={author.id}>
              <span className="flex items-center gap-2">
                <UserAvatar name={author.name} src={author.avatar} size="sm" />
                {author.name}
                {author.staff ? null : (
                  <span className="text-muted-foreground text-xs">shared account</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
