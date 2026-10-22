"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

/**
 * The visible box is the usual 16px (what GitHub, Linear and shadcn draw), but the control itself
 * is a 24px target around it, so it is easy to hit and meets WCAG 2.2 "target size". Making the
 * box itself bigger is the wrong fix: it looks clumsy in a table.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer group/checkbox relative flex size-6 shrink-0 items-center justify-center rounded-md outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
        "group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0",
        className,
      )}
      {...props}
    >
      <span
        data-slot="checkbox-box"
        aria-hidden="true"
        className={cn(
          "border-input dark:bg-input/30 flex size-4 items-center justify-center rounded-[4px] border transition-colors",
          "group-data-[checked]/checkbox:border-primary group-data-[checked]/checkbox:bg-primary group-data-[checked]/checkbox:text-primary-foreground",
          "group-data-[indeterminate]/checkbox:border-primary group-data-[indeterminate]/checkbox:bg-primary group-data-[indeterminate]/checkbox:text-primary-foreground",
          "dark:group-data-[checked]/checkbox:bg-primary dark:group-data-[indeterminate]/checkbox:bg-primary",
          "group-aria-invalid/checkbox:border-destructive",
        )}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
        >
          <CheckIcon />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
