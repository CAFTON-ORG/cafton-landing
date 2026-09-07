import { Checkbox } from "@/components/ui/checkbox";
import { getServicePillar } from "@/lib/services";

interface GoalsSystemsStepProps {
  goalsCategory: string;
  goals: string[];
  onToggle: (title: string, checked: boolean) => void;
  error?: string;
}

/** Second of the two Goals screens: only that one pillar's systems, not all ~19 at once. */
export function GoalsSystemsStep({
  goalsCategory,
  goals,
  onToggle,
  error,
}: GoalsSystemsStepProps) {
  const pillar = getServicePillar(goalsCategory);

  // Guarded by the "goalsArea" step's own validation before this one is
  // ever reachable -- this is a defensive fallback, not an expected path.
  if (!pillar) {
    return (
      <p className="text-sm text-muted-foreground">
        Go back and choose an area first.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Which of these, specifically, would help most?
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {pillar.systems.map((system) => {
          const checked = goals.includes(system.title);
          return (
            <label
              key={system.title}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-foreground/50"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => onToggle(system.title, next === true)}
                className="mt-0.5"
              />
              {system.title}
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
