import type { ContactFormData } from "@/lib/contact";

export type FieldErrors = Partial<Record<keyof ContactFormData, string>>;

export type StepId =
  | "personal"
  | "business"
  | "challenges"
  | "goalsArea"
  | "goalsSystems"
  | "final";

export interface Step {
  id: StepId;
  label: string;
}

/**
 * "Business Information" only appears when the project is for a business
 * that already exists -- see the standing plan doc for why this is gated
 * rather than always shown or optional-field-by-field. The Goals step is
 * split in two (area, then that area's systems) so a visitor only ever
 * sees one pillar's checkboxes at a time instead of all ~19 at once.
 */
export function buildSteps(buildingFor: ContactFormData["buildingFor"]): Step[] {
  const steps: Step[] = [{ id: "personal", label: "Personal Information" }];
  if (buildingFor === "An existing business") {
    steps.push({ id: "business", label: "Business Information" });
  }
  steps.push(
    { id: "challenges", label: "Your Challenges" },
    { id: "goalsArea", label: "Your Goals" },
    { id: "goalsSystems", label: "Your Goals" },
    { id: "final", label: "Final Details" },
  );
  return steps;
}
