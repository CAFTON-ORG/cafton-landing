import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Step } from "@/components/contact/types";

interface ProgressHeaderProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressHeader({ steps, currentStep }: ProgressHeaderProps) {
  return (
    <div>
      <div className="mb-3 flex items-center">
        {steps.map((s, index) => (
          <div key={s.id} className="flex flex-1 items-center last:flex-initial">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                index === currentStep
                  ? "border-foreground bg-foreground text-background"
                  : index < currentStep
                    ? "border-foreground/40 text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              {index < currentStep ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-px flex-1 transition-colors",
                  index < currentStep ? "bg-foreground/40" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Step {currentStep + 1} of {steps.length} - {steps[currentStep].label}
      </p>
    </div>
  );
}
