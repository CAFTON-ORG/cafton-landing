import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { buildingForOptions, type ContactFormData } from "@/lib/contact";
import type { FieldErrors } from "@/components/contact/types";

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
          <Label htmlFor="phone">
            Phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            name="phone"
            autoComplete="tel"
            value={formData.phone}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="buildingFor-0">This project is for</Label>
        <RadioGroup value={formData.buildingFor} onValueChange={onBuildingForChange}>
          {buildingForOptions.map((option, index) => (
            <label
              key={option}
              htmlFor={`buildingFor-${index}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-foreground/50"
            >
              <RadioGroupItem value={option} id={`buildingFor-${index}`} />
              {option}
            </label>
          ))}
        </RadioGroup>
        {errors.buildingFor && (
          <p className="text-sm text-destructive">{errors.buildingFor}</p>
        )}
      </div>
    </div>
  );
}
