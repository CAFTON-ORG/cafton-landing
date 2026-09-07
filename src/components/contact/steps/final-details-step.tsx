import type { ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  budgetRanges,
  referralSources,
  timelines,
  type ContactFormData,
} from "@/lib/contact";
import { Turnstile } from "@/components/shared/turnstile";
import type { FieldErrors } from "@/components/contact/types";

interface FinalDetailsStepProps {
  formData: ContactFormData;
  errors: FieldErrors;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSelectChange: (field: keyof ContactFormData, options: readonly string[]) => (value: string) => void;
  onTurnstileToken: (token: string | null) => void;
}

export function FinalDetailsStep({
  formData,
  errors,
  onChange,
  onSelectChange,
  onTurnstileToken,
}: FinalDetailsStepProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="budget">Estimated budget</Label>
          <Select value={formData.budget} onValueChange={onSelectChange("budget", budgetRanges)}>
            <SelectTrigger
              id="budget"
              className="w-full"
              aria-invalid={!!errors.budget}
              aria-describedby={errors.budget ? "budget-error" : undefined}
            >
              <SelectValue placeholder="Select a budget range" />
            </SelectTrigger>
            <SelectContent>
              {budgetRanges.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.budget && (
            <p id="budget-error" className="text-sm text-destructive">
              {errors.budget}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timeline">Desired timeline</Label>
          <Select value={formData.timeline} onValueChange={onSelectChange("timeline", timelines)}>
            <SelectTrigger
              id="timeline"
              className="w-full"
              aria-invalid={!!errors.timeline}
              aria-describedby={errors.timeline ? "timeline-error" : undefined}
            >
              <SelectValue placeholder="Select a timeline" />
            </SelectTrigger>
            <SelectContent>
              {timelines.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timeline && (
            <p id="timeline-error" className="text-sm text-destructive">
              {errors.timeline}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="referralSource">
          How did you hear about us? <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Select
          value={formData.referralSource}
          onValueChange={onSelectChange("referralSource", referralSources)}
        >
          <SelectTrigger id="referralSource" className="w-full">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {referralSources.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">
          Anything else about your project? <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="notes" name="notes" rows={5} value={formData.notes} onChange={onChange} />
      </div>
      <Turnstile onTokenChange={onTurnstileToken} />
    </div>
  );
}
