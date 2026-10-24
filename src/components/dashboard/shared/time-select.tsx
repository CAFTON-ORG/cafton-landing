"use client";

import { Clock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";

/** "14:30" -> "2:30 PM". */
export function timeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function options(from: number, to: number, step: number) {
  const list: string[] = [];
  for (let minutes = from; minutes <= to; minutes += step) {
    list.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    );
  }
  return list;
}

/**
 * The standard time field: a dropdown of times of day ("HH:mm") in `step`-minute steps. Times in
 * `suggested` (for example the free ones that day) are marked and listed with the rest, so
 * nothing is hidden; a value outside the range is kept so an old time is never lost.
 */
export function TimeSelect({
  id,
  value,
  onChange,
  step = 15,
  from = 7 * 60,
  to = 21 * 60,
  suggested = [],
  suggestedLabel = "Free",
  placeholder = "Pick a time",
  className,
  "aria-label": ariaLabel,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  /** Earliest time, in minutes after midnight. */
  from?: number;
  to?: number;
  suggested?: string[];
  suggestedLabel?: string;
  placeholder?: string;
  className?: string;
  /** Names the control for screen readers when there is no visible label. */
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  const list = options(from, to, step);
  for (const time of [...suggested, value]) if (time && !list.includes(time)) list.push(time);
  list.sort();
  return (
    <Select value={value} onValueChange={(next) => onChange(next ? String(next) : "")}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={className ?? "w-full"}
      >
        <Clock className="text-muted-foreground" aria-hidden="true" />
        <SelectValue placeholder={placeholder}>
          {(current: string | null) => (current ? timeLabel(current) : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map((time) => (
          <SelectItem key={time} value={time}>
            {timeLabel(time)}
            {suggested.includes(time) && (
              <span className="text-muted-foreground ml-auto text-xs">{suggestedLabel}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
