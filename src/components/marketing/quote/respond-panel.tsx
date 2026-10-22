"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMinor } from "@/lib/money";
import { respondToQuote } from "@/features/sales/public";

/**
 * Where the client answers. Accepting is a deliberate act: they type their full name and tick a box
 * that states what they agree to and the total. That, with the time and the address it came from,
 * is the record kept (an electronic signature under the Philippine E-Commerce Act, RA 8792).
 */
export function RespondPanel({
  token,
  totalMinor,
  currency,
  reference,
  recipientName,
}: {
  token: string;
  totalMinor: number;
  currency: string;
  reference: string;
  recipientName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [formError, setFormError] = useState("");
  const [mode, setMode] = useState<"accept" | "decline">("accept");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Plain, not the dashboard's toast helper: the public site has no toast area, so an error must
   * show where the person is looking, on the form.
   */
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setFormError("");
    const input =
      mode === "accept"
        ? ({ action: "accept", token, name, email, agreed } as const)
        : ({ action: "decline", token, reason } as const);
    start(async () => {
      const result = await respondToQuote(input as never);
      if (result.ok) {
        router.refresh();
        return;
      }
      if (result.fieldErrors) setErrors(result.fieldErrors);
      else setFormError(result.error);
    });
  }

  return (
    <section aria-labelledby="respond" className="bg-card rounded-xl border p-5 sm:p-6">
      <h2 id="respond" className="text-lg font-semibold">
        Your answer
      </h2>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Accept or decline">
        <Button
          type="button"
          variant={mode === "accept" ? "default" : "outline"}
          role="radio"
          aria-checked={mode === "accept"}
          onClick={() => setMode("accept")}
        >
          Accept this quote
        </Button>
        <Button
          type="button"
          variant={mode === "decline" ? "default" : "outline"}
          role="radio"
          aria-checked={mode === "decline"}
          onClick={() => setMode("decline")}
        >
          Decline
        </Button>
      </div>

      <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
        {mode === "accept" ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="accept-name">Your full name</Label>
              <Input
                id="accept-name"
                value={name}
                autoComplete="name"
                placeholder={recipientName}
                aria-invalid={!!errors.name}
                onChange={(event) => setName(event.target.value)}
              />
              {errors.name && (
                <p role="alert" className="text-destructive text-sm">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="accept-email">Your email (optional)</Label>
              <Input
                id="accept-email"
                type="email"
                value={email}
                autoComplete="email"
                aria-invalid={!!errors.email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">We send you a confirmation to keep.</p>
              {errors.email && (
                <p role="alert" className="text-destructive text-sm">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="accept-agree"
                checked={agreed}
                aria-invalid={!!errors.agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="accept-agree" className="text-sm leading-snug font-normal">
                I accept quote {reference} for {formatMinor(totalMinor, currency)}, and I agree to
                its terms. Typing my name and ticking this box is my electronic signature.
              </Label>
            </div>
            {errors.agreed && (
              <p role="alert" className="text-destructive text-sm">
                {errors.agreed}
              </p>
            )}
          </>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="decline-reason">Why not? (a line is enough)</Label>
            <Textarea
              id="decline-reason"
              rows={3}
              value={reason}
              aria-invalid={!!errors.reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {errors.reason && (
              <p role="alert" className="text-destructive text-sm">
                {errors.reason}
              </p>
            )}
          </div>
        )}
        {formError && (
          <p role="alert" className="text-destructive text-sm">
            {formError}
          </p>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : mode === "accept" ? "Accept the quote" : "Send my answer"}
          </Button>
        </div>
      </form>
    </section>
  );
}
