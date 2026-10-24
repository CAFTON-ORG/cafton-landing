"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { Calendar } from "@/components/dashboard/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/ui/popover";
import { cn } from "@/lib/utils";

const parse = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};
const format = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * The standard date field: a button that opens the shadcn Calendar. It holds a calendar date as
 * "YYYY-MM-DD" (no time zone, so it can't shift by a day). `isDisabled` marks days that can't be
 * picked, `clearable` adds a clear button.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  isDisabled,
  clearable = false,
  disabled = false,
  className,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: (date: Date) => boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={invalid}
              className={cn(
                // Buttons are shrink-0; this one must shrink so the clear button stays inside the field.
                "w-full min-w-0 shrink justify-start font-normal",
                !selected && "text-muted-foreground",
              )}
            />
          }
        >
          <CalendarIcon aria-hidden="true" />
          {selected
            ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(selected)
            : placeholder}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            disabled={isDisabled}
            onSelect={(date) => {
              if (date) {
                onChange(format(date));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear the date"
          onClick={() => onChange("")}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
