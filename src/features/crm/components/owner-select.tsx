"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import type { PersonRef } from "../types";

export const NONE = "none";

/**
 * Pick a staff member, or nobody. The empty choice is the literal "none" so the
 * control stays controlled; callers turn it back into null/undefined.
 */
export function PersonSelect({
  id,
  value,
  onChange,
  people,
  noneLabel = "Unassigned",
  disabled,
  size,
  "aria-label": ariaLabel,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  people: PersonRef[];
  noneLabel?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => onChange(next === NONE ? "" : String(next))}
      disabled={disabled}
    >
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} className={className ?? "w-full"}>
        <SelectValue>
          {(current: string) =>
            current === NONE
              ? noneLabel
              : (people.find((person) => person.id === current)?.name ?? noneLabel)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {people.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
