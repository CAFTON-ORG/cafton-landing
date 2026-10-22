"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker";

import { buttonVariants } from "@/components/dashboard/ui/button";
import { cn } from "@/lib/utils";

/**
 * The standard shadcn Calendar. Pass `mode="single"`, `selected` and `onSelect`; `disabled` takes
 * a matcher (a function, dates or ranges) for days that can't be picked.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("bg-background group/calendar p-3 [--cell-size:--spacing(9)]", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaults.months),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between", defaults.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaults.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaults.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaults.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaults.dropdowns,
        ),
        dropdown_root: cn("relative rounded-md border border-input", defaults.dropdown_root),
        dropdown: cn("absolute inset-0 opacity-0", defaults.dropdown),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaults.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-[0.8rem] font-normal text-foreground/70 select-none",
          defaults.weekday,
        ),
        week: cn("mt-2 flex w-full", defaults.week),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none",
          defaults.day,
        ),
        today: cn("rounded-md bg-accent text-accent-foreground", defaults.today),
        outside: cn("text-foreground/60 aria-selected:text-foreground/60", defaults.outside),
        disabled: cn("text-foreground/50 opacity-50", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rest }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...rest} />
        ),
        Chevron: ({ className, orientation, ...rest }) => {
          if (orientation === "left")
            return <ChevronLeftIcon className={cn("size-4", className)} {...rest} />;
          if (orientation === "right")
            return <ChevronRightIcon className={cn("size-4", className)} {...rest} />;
          return <ChevronDownIcon className={cn("size-4", className)} {...rest} />;
        },
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected ? "true" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal",
        "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:hover:bg-primary",
        "group-data-[focused=true]/day:ring-ring/50 group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
