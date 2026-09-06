"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  baseContactSchema,
  budgetRanges,
  buildingForOptions,
  businessInfoStepSchema,
  businessSizes,
  challengeOptions,
  contactFormDefaults,
  contactSchema,
  goalsStepSchema,
  industries,
  positions,
  referralSources,
  timelines,
  yearsOperating,
  type ContactFormData,
} from "@/lib/contact";
import { getServicePillar, servicePillars } from "@/lib/services";
import { Turnstile } from "@/components/shared/turnstile";
import { cn } from "@/lib/utils";
import type { ZodType } from "zod";

type FieldErrors = Partial<Record<keyof ContactFormData, string>>;

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type StepId = "personal" | "business" | "challenges" | "goals" | "final";

interface Step {
  id: StepId;
  label: string;
}

/** "Business Information" only appears when the project is for a business that already exists -- see the standing plan doc for why this is gated rather than always shown or optional-field-by-field. */
function buildSteps(buildingFor: ContactFormData["buildingFor"]): Step[] {
  const steps: Step[] = [{ id: "personal", label: "Personal Information" }];
  if (buildingFor === "An existing business") {
    steps.push({ id: "business", label: "Business Information" });
  }
  steps.push(
    { id: "challenges", label: "Your Challenges" },
    { id: "goals", label: "Your Goals" },
    { id: "final", label: "Final Details" },
  );
  return steps;
}

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
  goals: goalsStepSchema,
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
  goals: ["goals"],
  final: ["budget", "timeline", "referralSource", "notes"],
};

type ContactFormProps = {
  /** Value sent as the `website_lead_source` HubSpot property, e.g. "Homepage" or "Contact Us Page". */
  leadSource: string;
  /** Sent as `context.pageName` in the HubSpot submission. */
  pageName: string;
  className?: string;
};

export function ContactForm({
  leadSource,
  pageName,
  className = "",
}: ContactFormProps) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  // Arriving from the hero's build-and-pick flow -- a chosen service area
  // (?category=<pillar slug>) pre-checks that pillar's systems in the Goals
  // step, computed as the initial state itself (searchParams is already
  // available on first render). The form always still opens on step 1 at
  // the top of the page -- no jumping ahead or scrolling down.
  const [formData, setFormData] = useState<ContactFormData>(() => {
    const category = searchParams.get("category");
    const pillar = category ? getServicePillar(category) : undefined;
    if (pillar) {
      return { ...contactFormDefaults, goals: pillar.systems.map((s) => s.title) };
    }
    return contactFormDefaults;
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
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
      setErrorMessage(
        "Complete the security verification before sending your message.",
      );
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
        (submission && "message" in submission
          ? submission.message
          : undefined) ??
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
      <div
        role="status"
        className={`flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center ${className}`}
      >
        <CheckCircle2 className="size-10 text-primary" />
        <h2 className="text-2xl font-semibold">Message sent</h2>
        <p className="max-w-md text-muted-foreground">
          Thanks for reaching out. We usually reply within 1 business day.
        </p>
        {/*
          Scheduling plan (not integrated yet -- no CRM/booking tool is wired
          up on this project): once one is chosen, this is where a "pick a
          time" step would go. The footer already links out to a working
          Calendly (https://calendly.com/cafton-company/consultation) for
          "Book a call" -- that's the natural thing to reuse here rather than
          adding a second, different scheduling tool.
        */}
        <Button
          variant="outline"
          className="mt-2 cursor-pointer"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </div>
    );
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
      <div>
        <div className="mb-3 flex items-center">
          {steps.map((s, index) => (
            <div key={s.id} className="flex flex-1 items-center last:flex-initial">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  index === step
                    ? "border-foreground bg-foreground text-background"
                    : index < step
                      ? "border-foreground/40 text-foreground"
                      : "border-border text-muted-foreground",
                )}
              >
                {index < step ? <Check className="size-4" aria-hidden="true" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 transition-colors",
                    index < step ? "bg-foreground/40" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Step {step + 1} of {steps.length} - {currentStep.label}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {currentStep.id === "personal" && (
          <motion.div key="step-personal" {...stepAnim(1)} className="grid gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="buildingFor-0">This project is for</Label>
              <RadioGroup
                value={formData.buildingFor}
                onValueChange={handleSelectChange("buildingFor", buildingForOptions)}
              >
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
          </motion.div>
        )}

        {currentStep.id === "business" && (
          <motion.div key="step-business" {...stepAnim(1)} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
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
                <Select
                  value={formData.industry}
                  onValueChange={handleSelectChange("industry", industries)}
                >
                  <SelectTrigger
                    id="industry"
                    className="w-full"
                    aria-invalid={!!errors.industry}
                  >
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
                {errors.industry && (
                  <p className="text-sm text-destructive">{errors.industry}</p>
                )}
                {formData.industry === "Other" && (
                  <Input
                    name="industryOther"
                    placeholder="Please specify your industry"
                    value={formData.industryOther}
                    onChange={handleChange}
                    aria-invalid={!!errors.industryOther}
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Your role</Label>
                <Select
                  value={formData.position}
                  onValueChange={handleSelectChange("position", positions)}
                >
                  <SelectTrigger
                    id="position"
                    className="w-full"
                    aria-invalid={!!errors.position}
                  >
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
                {errors.position && (
                  <p className="text-sm text-destructive">{errors.position}</p>
                )}
                {formData.position === "Other" && (
                  <Input
                    name="positionOther"
                    placeholder="Please specify your role"
                    value={formData.positionOther}
                    onChange={handleChange}
                    aria-invalid={!!errors.positionOther}
                  />
                )}
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="businessSize">Business size</Label>
                <Select
                  value={formData.businessSize}
                  onValueChange={handleSelectChange("businessSize", businessSizes)}
                >
                  <SelectTrigger
                    id="businessSize"
                    className="w-full"
                    aria-invalid={!!errors.businessSize}
                  >
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
                  onValueChange={handleSelectChange("yearsOperating", yearsOperating)}
                >
                  <SelectTrigger
                    id="yearsOperating"
                    className="w-full"
                    aria-invalid={!!errors.yearsOperating}
                  >
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
                onChange={handleChange}
              />
            </div>
          </motion.div>
        )}

        {currentStep.id === "challenges" && (
          <motion.div key="step-challenges" {...stepAnim(1)} className="grid gap-6">
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
                      onCheckedChange={(next) =>
                        handleChallengeToggle(option, next === true)
                      }
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
                  onChange={handleChange}
                />
              </div>
            )}
          </motion.div>
        )}

        {currentStep.id === "goals" && (
          <motion.div key="step-goals" {...stepAnim(1)} className="grid gap-6">
            <p className="text-sm text-muted-foreground">
              Select the systems that matter most to you right now.
            </p>
            {servicePillars.map((pillar) => (
              <div key={pillar.slug} className="grid gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {pillar.title}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pillar.systems.map((system) => {
                    const checked = formData.goals.includes(system.title);
                    return (
                      <label
                        key={system.title}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-foreground/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            handleGoalToggle(system.title, next === true)
                          }
                          className="mt-0.5"
                        />
                        {system.title}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {errors.goals && <p className="text-sm text-destructive">{errors.goals}</p>}
          </motion.div>
        )}

        {currentStep.id === "final" && (
          <motion.div key="step-final" {...stepAnim(1)} className="grid gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="budget">Estimated budget</Label>
                <Select
                  value={formData.budget}
                  onValueChange={handleSelectChange("budget", budgetRanges)}
                >
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
                <Select
                  value={formData.timeline}
                  onValueChange={handleSelectChange("timeline", timelines)}
                >
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
                How did you hear about us?{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={formData.referralSource}
                onValueChange={handleSelectChange("referralSource", referralSources)}
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
                Anything else about your project?{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                rows={5}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
            <Turnstile onTokenChange={setTurnstileToken} />
          </motion.div>
        )}
      </AnimatePresence>

      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={handleBack}
          >
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
          <Button
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
