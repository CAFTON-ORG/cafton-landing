"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  contactFormDefaults,
  contactSchema,
  projectTypes,
  type ContactFormData,
} from "@/lib/contact";
import { Turnstile } from "@/components/shared/turnstile";

type FieldErrors = Partial<Record<keyof ContactFormData, string>>;

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
  const [formData, setFormData] = useState<ContactFormData>(contactFormDefaults);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectTypeChange = (value: string) => {
    if (projectTypes.includes(value as ContactFormData["projectType"])) {
      setFormData((prev) => ({
        ...prev,
        projectType: value as ContactFormData["projectType"],
      }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      <div
        className={`flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center ${className}`}
      >
        <CheckCircle2 className="size-10 text-primary" />
        <h2 className="text-2xl font-semibold">Message sent</h2>
        <p className="max-w-md text-muted-foreground">
          Thanks for reaching out. We usually reply within 1 business day.
        </p>
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

  return (
    <form
      className={`grid gap-6 rounded-xl border bg-card p-6 sm:p-8 ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
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
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName}</p>
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
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName}</p>
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
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
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
      <div className="grid gap-2">
        <Label htmlFor="organization">
          Organization <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="organization"
          name="organization"
          autoComplete="organization"
          value={formData.organization}
          onChange={handleChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="projectType">Project type</Label>
        <Select
          value={formData.projectType}
          onValueChange={handleProjectTypeChange}
        >
          <SelectTrigger id="projectType" className="w-full">
            <SelectValue placeholder="Select a project type" />
          </SelectTrigger>
          <SelectContent>
            {projectTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project">Tell us about your project</Label>
        <Textarea
          id="project"
          name="project"
          rows={6}
          value={formData.project}
          onChange={handleChange}
          aria-invalid={!!errors.project}
        />
        {errors.project && (
          <p className="text-sm text-destructive">{errors.project}</p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="budget">
            Budget range{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="budget"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timeline">
            Timeline <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="timeline"
            name="timeline"
            value={formData.timeline}
            onChange={handleChange}
          />
        </div>
      </div>
      <Turnstile onTokenChange={setTurnstileToken} />
      {status === "error" && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      <Button
        type="submit"
        disabled={status === "submitting"}
        className="cursor-pointer"
      >
        {status === "submitting" && <Loader2 className="animate-spin" />}
        {status === "submitting" ? "Sending..." : "Send Inquiry"}
      </Button>
    </form>
  );
}
