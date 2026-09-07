import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  businessSizes,
  industries,
  positions,
  yearsOperating,
  type ContactFormData,
} from "@/lib/contact";
import type { FieldErrors } from "@/components/contact/types";

interface BusinessInfoStepProps {
  formData: ContactFormData;
  errors: FieldErrors;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (field: keyof ContactFormData, options: readonly string[]) => (value: string) => void;
}

export function BusinessInfoStep({
  formData,
  errors,
  onChange,
  onSelectChange,
}: BusinessInfoStepProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          value={formData.businessName}
          onChange={onChange}
          aria-invalid={!!errors.businessName}
          aria-describedby={errors.businessName ? "businessName-error" : undefined}
        />
        {errors.businessName && (
          <p id="businessName-error" className="text-sm text-destructive">
            {errors.businessName}
          </p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.industry} onValueChange={onSelectChange("industry", industries)}>
            <SelectTrigger id="industry" className="w-full" aria-invalid={!!errors.industry}>
              <SelectValue placeholder="Select an industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.industry && <p className="text-sm text-destructive">{errors.industry}</p>}
          {formData.industry === "Other" && (
            <>
              <Input
                name="industryOther"
                placeholder="Please specify your industry"
                value={formData.industryOther}
                onChange={onChange}
                aria-invalid={!!errors.industryOther}
              />
              {errors.industryOther && (
                <p className="text-sm text-destructive">{errors.industryOther}</p>
              )}
            </>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="position">Your role</Label>
          <Select value={formData.position} onValueChange={onSelectChange("position", positions)}>
            <SelectTrigger id="position" className="w-full" aria-invalid={!!errors.position}>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {positions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.position && <p className="text-sm text-destructive">{errors.position}</p>}
          {formData.position === "Other" && (
            <>
              <Input
                name="positionOther"
                placeholder="Please specify your role"
                value={formData.positionOther}
                onChange={onChange}
                aria-invalid={!!errors.positionOther}
              />
              {errors.positionOther && (
                <p className="text-sm text-destructive">{errors.positionOther}</p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="businessSize">Business size</Label>
          <Select
            value={formData.businessSize}
            onValueChange={onSelectChange("businessSize", businessSizes)}
          >
            <SelectTrigger id="businessSize" className="w-full" aria-invalid={!!errors.businessSize}>
              <SelectValue placeholder="Select a business size" />
            </SelectTrigger>
            <SelectContent>
              {businessSizes.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.businessSize && (
            <p className="text-sm text-destructive">{errors.businessSize}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="yearsOperating">Years operating</Label>
          <Select
            value={formData.yearsOperating}
            onValueChange={onSelectChange("yearsOperating", yearsOperating)}
          >
            <SelectTrigger id="yearsOperating" className="w-full" aria-invalid={!!errors.yearsOperating}>
              <SelectValue placeholder="Select a range" />
            </SelectTrigger>
            <SelectContent>
              {yearsOperating.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.yearsOperating && (
            <p className="text-sm text-destructive">{errors.yearsOperating}</p>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="officeAddress">
          Office address <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="officeAddress"
          name="officeAddress"
          value={formData.officeAddress}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
