"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";
import type { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import {
  baseContactSchema,
  businessInfoStepSchema,
  challengeOptions,
  contactFormDefaults,
  contactSchema,
  goalsAreaStepSchema,
  goalsSystemsStepSchema,
  buildingForOptions,
  type ContactFormData,
} from "@/lib/contact";
import { getServicePillar } from "@/lib/services";
import { buildSteps, type FieldErrors, type StepId } from "@/components/contact/types";
import { ProgressHeader } from "@/components/contact/progress-header";
import { SuccessScreen } from "@/components/contact/success-screen";
import { PersonalInfoStep } from "@/components/contact/steps/personal-info-step";
import { BusinessInfoStep } from "@/components/contact/steps/business-info-step";
import { ChallengesStep } from "@/components/contact/steps/challenges-step";
import { GoalsAreaStep } from "@/components/contact/steps/goals-area-step";
import { GoalsSystemsStep } from "@/components/contact/steps/goals-systems-step";
import { FinalDetailsStep } from "@/components/contact/steps/final-details-step";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const STEP_SCHEMAS: Record<StepId, ZodType> = {
  personal: baseContactSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    buildingFor: true,
  }),
  business: businessInfoStepSchema,
  challenges: baseContactSchema.pick({ challenges: true, challengesOther: true }),
  goalsArea: goalsAreaStepSchema,
  goalsSystems: goalsSystemsStepSchema,
  final: baseContactSchema.pick({
    budget: true,
    timeline: true,
    referralSource: true,
    notes: true,
  }),
};

const STEP_FIELDS: Record<StepId, (keyof ContactFormData)[]> = {
  personal: ["firstName", "lastName", "email", "phone", "buildingFor"],
  business: [
    "businessName",
    "industry",
    "industryOther",
    "position",
    "positionOther",
    "businessSize",
    "yearsOperating",
    "officeAddress",
  ],
  challenges: ["challenges", "challengesOther"],
  goalsArea: ["goalsCategory"],
  goalsSystems: ["goals"],
  final: ["budget", "timeline", "referralSource", "notes"],
};

type ContactFormProps = {
  /** Value sent as the `website_lead_source` HubSpot property, e.g. "Homepage" or "Contact Us Page". */
  leadSource: string;
  /** Sent as `context.pageName` in the HubSpot submission. */
  pageName: string;
  className?: string;
};

export function ContactForm({ leadSource, pageName, className = "" }: ContactFormProps) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  // Arriving from the hero's build-and-pick flow -- a chosen service area
  // (?category=<pillar slug>) pre-selects that pillar in the Goals-area
  // step, computed as the initial state itself (searchParams is already
  // available on first render). The form always still opens on step 1 at
  // the top of the page -- no jumping ahead or scrolling down.
  const [formData, setFormData] = useState<ContactFormData>(() => {
    const category = searchParams.get("category");
    const pillar = category ? getServicePillar(category) : undefined;
    if (pillar) {
      return { ...contactFormDefaults, goalsCategory: pillar.slug };
    }
    return contactFormDefaults;
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const steps = buildSteps(formData.buildingFor);
  const currentStep = steps[step];

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  function handleSelectChange<K extends keyof ContactFormData>(
    field: K,
    options: readonly string[],
  ) {
    return (value: string) => {
      if (options.includes(value)) {
        setFormData((prev) => ({ ...prev, [field]: value as ContactFormData[K] }));
      }
    };
  }

  const handleGoalsCategoryChange = (slug: string) => {
    setFormData((prev) => ({
      ...prev,
      goalsCategory: slug,
      // Systems picked under a different pillar don't carry over.
      goals: prev.goalsCategory === slug ? prev.goals : [],
    }));
  };

  const handleChallengeToggle = (
    option: (typeof challengeOptions)[number],
    checked: boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      challenges: checked
        ? [...prev.challenges, option]
        : prev.challenges.filter((c) => c !== option),
    }));
  };

  const handleGoalToggle = (title: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      goals: checked ? [...prev.goals, title] : prev.goals.filter((g) => g !== title),
    }));
  };

  const validateStep = (stepId: StepId): boolean => {
    const result = STEP_SCHEMAS[stepId].safeParse(formData);
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        for (const field of STEP_FIELDS[stepId]) delete next[field];
        return next;
      });
      return true;
    }
    const stepErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ContactFormData;
      if (!stepErrors[key]) stepErrors[key] = issue.message;
    }
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    return false;
  };

  const handleNext = () => {
    if (validateStep(currentStep.id)) setStep((current) => current + 1);
  };

  const handleBack = () => setStep((current) => Math.max(0, current - 1));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Enter pressed inside an earlier step's field submits the form
    // natively -- treat that the same as pressing "Next" instead of
    // attempting a real submission before the later steps are filled.
    if (step < steps.length - 1) {
      handleNext();
      return;
    }

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ContactFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!turnstileToken) {
      setStatus("error");
      setErrorMessage("Complete the security verification before sending your message.");
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: result.data,
          leadSource,
          pageName,
          pagePath: window.location.pathname,
          turnstileToken,
        }),
      });
      const submission = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok?: false; message?: string }
        | null;

      if (response.ok && submission?.ok) {
        setStatus("success");
        setFormData(contactFormDefaults);
        setStep(0);
        return;
      }

      setStatus("error");
      setErrorMessage(
        (submission && "message" in submission ? submission.message : undefined) ??
          "Something went wrong sending your message. Please try again or email us directly.",
      );
      setTurnstileToken(null);
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again or email us directly.");
      setTurnstileToken(null);
    }
  };

  if (status === "success") {
    return <SuccessScreen className={className} onReset={() => setStatus("idle")} />;
  }

  const stepAnim = (direction: 1 | -1) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, x: 16 * direction },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -16 * direction },
          transition: { duration: 0.3, ease: EASE_OUT },
        };

  return (
    <form
      className={`grid gap-6 rounded-xl border bg-card p-6 sm:p-8 ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <ProgressHeader steps={steps} currentStep={step} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={currentStep.id} {...stepAnim(1)}>
          {currentStep.id === "personal" && (
            <PersonalInfoStep
              formData={formData}
              errors={errors}
              onChange={handleChange}
              onBuildingForChange={handleSelectChange("buildingFor", buildingForOptions)}
            />
          )}
          {currentStep.id === "business" && (
            <BusinessInfoStep
              formData={formData}
              errors={errors}
              onChange={handleChange}
              onSelectChange={handleSelectChange}
            />
          )}
          {currentStep.id === "challenges" && (
            <ChallengesStep
              formData={formData}
              onChange={handleChange}
              onToggle={handleChallengeToggle}
            />
          )}
          {currentStep.id === "goalsArea" && (
            <GoalsAreaStep
              value={formData.goalsCategory}
              onChange={handleGoalsCategoryChange}
              error={errors.goalsCategory}
            />
          )}
          {currentStep.id === "goalsSystems" && (
            <GoalsSystemsStep
              goalsCategory={formData.goalsCategory}
              goals={formData.goals}
              onToggle={handleGoalToggle}
              error={errors.goals}
            />
          )}
          {currentStep.id === "final" && (
            <FinalDetailsStep
              formData={formData}
              errors={errors}
              onChange={handleChange}
              onSelectChange={handleSelectChange}
              onTurnstileToken={setTurnstileToken}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" className="cursor-pointer" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < steps.length - 1 ? (
          <Button type="button" className="cursor-pointer" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button type="submit" disabled={status === "submitting"} className="cursor-pointer">
            {status === "submitting" && (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {status === "submitting" ? "Sending..." : "Send Inquiry"}
          </Button>
        )}
      </div>
    </form>
  );
}
