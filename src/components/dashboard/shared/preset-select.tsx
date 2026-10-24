"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { withCurrent } from "@/lib/options";

/**
 * A short list to pick from instead of typing. A saved value that is not on the list stays
 * selectable, so opening an older record never changes it. `optionLabel` can add a note to an
 * option in the menu (the trigger always shows the plain value).
 */
export function PresetSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  optionLabel,
  placeholder,
  className = "w-full",
}: {
  id?: string;
  /** Accessible name when no visible `<label htmlFor>` points at `id`. */
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  optionLabel?: (option: string) => string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onChange(String(next))}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={label} className={className}>
        <SelectValue placeholder={placeholder}>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {withCurrent(options, value).map((option) => (
          <SelectItem key={option} value={option}>
            {optionLabel ? optionLabel(option) : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
