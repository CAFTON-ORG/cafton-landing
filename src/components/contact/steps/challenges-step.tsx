import type { ChangeEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { challengeOptions, type ContactFormData } from "@/lib/contact";

interface ChallengesStepProps {
  formData: ContactFormData;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggle: (option: (typeof challengeOptions)[number], checked: boolean) => void;
}

export function ChallengesStep({ formData, onChange, onToggle }: ChallengesStepProps) {
  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">
        Pick everything that applies. It shapes what we recommend.
      </p>
      <div className="grid gap-2">
        {challengeOptions.map((option) => {
          const checked = formData.challenges.includes(option);
          return (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-foreground/50"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => onToggle(option, next === true)}
                className="mt-0.5"
              />
              {option}
            </label>
          );
        })}
      </div>
      {formData.challenges.includes("Something else") && (
        <div className="grid gap-2">
          <Label htmlFor="challengesOther">Tell us more</Label>
          <Input
            id="challengesOther"
            name="challengesOther"
            value={formData.challengesOther}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
