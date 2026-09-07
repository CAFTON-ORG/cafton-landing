import { servicePillars } from "@/lib/services";
import { cn } from "@/lib/utils";

interface GoalsAreaStepProps {
  value: string;
  onChange: (slug: string) => void;
  error?: string;
}

/** First of the two Goals screens: pick one of the 4 service pillars before seeing its specific systems. */
export function GoalsAreaStep({ value, onChange, error }: GoalsAreaStepProps) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Which area is closest to what you need?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {servicePillars.map((pillar) => {
          const isSelected = value === pillar.slug;
          return (
            <button
              key={pillar.slug}
              type="button"
              onClick={() => onChange(pillar.slug)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/50",
              )}
            >
              <pillar.icon className="size-5" aria-hidden="true" />
              <span className="text-sm font-semibold">{pillar.title}</span>
              <span
                className={cn(
                  "text-xs leading-5",
                  isSelected ? "text-background/80" : "text-muted-foreground",
                )}
              >
                {pillar.tagline}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
