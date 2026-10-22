"use client";

import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  challengeOptions,
  contactFormDefaults,
  contactSchema,
  buildingForOptions,
  type ContactFormData,
} from "@/features/crm/contact";
import { useBooking, useServicePillars } from "@/providers/site-settings";
import { STEP_FIELDS, STEP_SCHEMAS } from "@/components/marketing/contact/step-config";
import { buildSteps, type FieldErrors, type StepId } from "@/components/marketing/contact/types";
import { ProgressHeader } from "@/components/marketing/contact/progress-header";
import { SuccessScreen } from "@/components/marketing/contact/success-screen";
import { PersonalInfoStep } from "@/components/marketing/contact/steps/personal-info-step";
import { BusinessInfoStep } from "@/components/marketing/contact/steps/business-info-step";
import { ChallengesStep } from "@/components/marketing/contact/steps/challenges-step";
import { GoalsAreaStep } from "@/components/marketing/contact/steps/goals-area-step";
import { GoalsSystemsStep } from "@/components/marketing/contact/steps/goals-systems-step";
import { FinalDetailsStep } from "@/components/marketing/contact/steps/final-details-step";
import { ScheduleStep, type MeetingChoice } from "@/components/marketing/contact/steps/schedule-step";

type ContactFormProps = {
  /** Where the enquiry came from, stored on the lead, e.g. "Homepage" or "Contact Us Page". */
  leadSource: string;
  /** Name of the page the form was on, shown in the lead's first timeline entry. */
  pageName: string;
  className?: string;
};

export function ContactForm({ leadSource, pageName, className = "" }: ContactFormProps) {
  const servicePillars = useServicePillars();
  const booking = useBooking();
  const getServicePillar = (slug: string) => servicePillars.find((pillar) => pillar.slug === slug);
  const searchParams = useSearchParams();

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

  const [meeting, setMeeting] = useState<MeetingChoice | null>(null);
  const [booked, setBooked] = useState<{ outcome?: string; start?: string } | null>(null);
  const steps = buildSteps(formData.buildingFor, booking.enabled);
  const currentStep = steps[step];

  // Errors are only raised by pressing Next/Send. Once a field has one, it is
  // re-checked against the live value on every change: the message updates
  // while the value is still wrong and disappears (along with the red
  // border, which is driven by `aria-invalid`) the moment it is valid.
  // Fields that have not been flagged are never validated early.
  const visibleErrors = useMemo<FieldErrors>(() => {
    const flagged = Object.keys(errors) as (keyof ContactFormData)[];
    if (flagged.length === 0) return errors;
    const schema = currentStep.id === "final" ? contactSchema : STEP_SCHEMAS[currentStep.id];
    const result = schema.safeParse(formData);
    if (result.success) return {};
    const live: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ContactFormData;
      if (!live[key]) live[key] = issue.message;
    }
    const next: FieldErrors = {};
    for (const key of flagged) {
      if (live[key]) next[key] = live[key];
    }
    return next;
  }, [errors, formData, currentStep.id]);

  const handleTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
    if (token) setStatus((current) => (current === "error" ? "idle" : current));
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (phone: string) => {
    setFormData((prev) => ({ ...prev, phone }));
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
          ...(meeting && { meeting }),
        }),
      });
      const submission = (await response.json().catch(() => null)) as
        | { ok: true; meeting?: string }
        | { ok?: false; message?: string }
        | null;

      if (response.ok && submission?.ok) {
        setBooked(meeting ? { outcome: submission.meeting, start: meeting.start } : null);
        setStatus("success");
        setMeeting(null);
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
    return (
      <SuccessScreen
        className={className}
        meeting={booked ?? undefined}
        onReset={() => setStatus("idle")}
      />
    );
  }

  return (
    <form
      className={`grid gap-6 rounded-xl border bg-card p-6 sm:p-8 ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <ProgressHeader steps={steps} currentStep={step} />

      <div
        key={currentStep.id}
        className="animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none"
      >
          {currentStep.id === "personal" && (
            <PersonalInfoStep
              formData={formData}
              errors={visibleErrors}
              onChange={handleChange}
              onPhoneChange={handlePhoneChange}
              onBuildingForChange={handleSelectChange("buildingFor", buildingForOptions)}
            />
          )}
          {currentStep.id === "business" && (
            <BusinessInfoStep
              formData={formData}
              errors={visibleErrors}
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
              error={visibleErrors.goalsCategory}
            />
          )}
          {currentStep.id === "goalsSystems" && (
            <GoalsSystemsStep
              goalsCategory={formData.goalsCategory}
              goals={formData.goals}
              onToggle={handleGoalToggle}
              error={visibleErrors.goals}
            />
          )}
          {currentStep.id === "schedule" && (
            <ScheduleStep value={meeting} onChange={setMeeting} intro={booking.intro} />
          )}
          {currentStep.id === "final" && (
            <FinalDetailsStep
              formData={formData}
              errors={visibleErrors}
              onChange={handleChange}
              onSelectChange={handleSelectChange}
              onTurnstileToken={handleTurnstileToken}
            />
          )}
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {/*
        Next and Send are different buttons that occupy the same spot. Without
        distinct keys React reuses one DOM button and flips its type from
        "button" to "submit" mid-click, so the browser's default action then
        submits the form the moment the last step appears.
      */}
      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" className="cursor-pointer" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < steps.length - 1 ? (
          <Button key="next" type="button" className="cursor-pointer" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button
            key="send"
            type="submit"
            disabled={status === "submitting"}
            className="cursor-pointer"
          >
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
