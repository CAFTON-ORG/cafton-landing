"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { sendRecordEmail } from "../actions/email";
import type { Subject } from "../types/core";

/**
 * Writes and sends an email to the person on a lead, contact or deal. Replies come to the sender's
 * own address, and the message is kept on the timeline once it has been sent.
 */
export function SendEmailDialog({
  to,
  recipient,
}: {
  to: Subject;
  /** Who it goes to. The address is shown when the page knows it; the server decides the real one. */
  recipient: { name: string; email?: string };
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(() => sendRecordEmail({ subject, body, to }), {
      success: "Email sent and added to the timeline.",
      onSuccess: () => {
        setOpen(false);
        setSubject("");
        setBody("");
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Send aria-hidden="true" /> Send an email
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Send an email</DialogTitle>
            <DialogDescription>
              To {recipient.name}
              {recipient.email ? ` <${recipient.email}>` : ""}. Replies come to your own address,
              and the message is kept on the timeline.
            </DialogDescription>
          </DialogHeader>
          <Field id="email-subject" label="Subject" required error={errors.subject}>
            <Input
              id="email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              aria-invalid={!!errors.subject}
              maxLength={200}
            />
          </Field>
          <Field id="email-body" label="Message" required error={errors.body ?? errors.form}>
            <Textarea
              id="email-body"
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              aria-invalid={!!errors.body}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !subject.trim() || !body.trim()}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
