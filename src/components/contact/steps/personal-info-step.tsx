import type { ChangeEvent } from "react";
import { Building2, Lightbulb, User, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { buildingForOptions, type ContactFormData } from "@/lib/contact";
import type { FieldErrors } from "@/components/contact/types";
import { cn } from "@/lib/utils";

/** Icon + one-line description per option, matching the Goals-area step's card-tile treatment. */
const BUILDING_FOR_DETAILS: Record<
  (typeof buildingForOptions)[number],
  { icon: LucideIcon; description: string }
> = {
  "An existing business": {
    icon: Building2,
    description: "We already have an operating business.",
  },
  "A new idea or startup": {
    icon: Lightbulb,
    description: "We're building something new from scratch.",
  },
  "A personal or side project": {
    icon: User,
    description: "This is a personal or smaller-scale project.",
  },
};

interface PersonalInfoStepProps {
  formData: ContactFormData;
  errors: FieldErrors;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBuildingForChange: (value: string) => void;
}

export function PersonalInfoStep({
  formData,
  errors,
  onChange,
  onBuildingForChange,
}: PersonalInfoStepProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={onChange}
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
          />
          {errors.firstName && (
            <p id="firstName-error" className="text-sm text-destructive">
              {errors.firstName}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={onChange}
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName && (
            <p id="lastName-error" className="text-sm text-destructive">
              {errors.lastName}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={onChange}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            name="phone"
            autoComplete="tel"
            value={formData.phone}
            onChange={onChange}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="buildingFor-0">This project is for</Label>
        <RadioGroup
          value={formData.buildingFor}
          onValueChange={onBuildingForChange}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {buildingForOptions.map((option, index) => {
            const isSelected = formData.buildingFor === option;
            const { icon: Icon, description } = BUILDING_FOR_DETAILS[option];
            return (
              <label
                key={option}
                htmlFor={`buildingFor-${index}`}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50",
                )}
              >
                <RadioGroupItem value={option} id={`buildingFor-${index}`} className="sr-only" />
                <Icon className="size-5" aria-hidden="true" />
                <span className="text-sm font-semibold">{option}</span>
                <span
                  className={cn(
                    "text-xs leading-5",
                    isSelected ? "text-background/80" : "text-muted-foreground",
                  )}
                >
                  {description}
                </span>
              </label>
            );
          })}
        </RadioGroup>
        {errors.buildingFor && (
          <p className="text-sm text-destructive">{errors.buildingFor}</p>
        )}
      </div>
    </div>
  );
}
