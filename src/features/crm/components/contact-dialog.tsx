"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

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
import { createContact, updateContact } from "../actions/contacts";
import type { ContactView, PersonRef } from "../types";
import { PersonSelect } from "./owner-select";

/** Create (no `contact`) or edit a contact. The trigger is whatever the caller passes in. */
export function ContactDialog({
  contact,
  organizations,
  people,
  trigger,
  defaultOrganizationId,
}: {
  contact?: ContactView;
  organizations: PersonRef[];
  people: PersonRef[];
  trigger: ReactNode;
  defaultOrganizationId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();
  const initial = {
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    position: contact?.position ?? "",
    organizationId: contact?.organizationId ?? defaultOrganizationId ?? "",
    ownerId: contact?.ownerId ?? "",
    notes: contact?.notes ?? "",
  };
  const [values, setValues] = useState(initial);
  const set = (key: keyof typeof initial) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const input = (key: keyof typeof initial) => ({
    id: `contact-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key)(event.target.value),
    "aria-invalid": !!errors[key],
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const payload = {
      ...values,
      organizationId: values.organizationId || "none",
      ownerId: values.ownerId || "none",
    };
    run(() => (contact ? updateContact(contact.id, payload) : createContact(payload)), {
      success: contact ? "Contact updated." : "Contact added.",
      onSuccess: (data) => {
        setOpen(false);
        if (!contact) {
          setValues(initial);
          const created = data as { id: string } | undefined;
          if (created?.id) router.push(`/dashboard/crm/contacts/${created.id}`);
        }
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setValues(initial);
          setErrors({});
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{contact ? "Edit contact" : "Add a contact"}</DialogTitle>
            <DialogDescription>
              People you do business with. Email addresses are unique.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contact-firstName" label="First name" required error={errors.firstName}>
              <Input {...input("firstName")} autoComplete="off" />
            </Field>
            <Field id="contact-lastName" label="Last name" required error={errors.lastName}>
              <Input {...input("lastName")} autoComplete="off" />
            </Field>
          </div>
          <Field id="contact-email" label="Email" required error={errors.email}>
            <Input {...input("email")} type="email" autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contact-phone" label="Phone" error={errors.phone}>
              <Input {...input("phone")} type="tel" />
            </Field>
            <Field id="contact-position" label="Role or title" error={errors.position}>
              <Input {...input("position")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contact-organizationId" label="Organization">
              <PersonSelect
                id="contact-organizationId"
                value={values.organizationId}
                onChange={set("organizationId")}
                people={organizations}
                noneLabel="No organization"
              />
            </Field>
            <Field id="contact-ownerId" label="Owner">
              <PersonSelect
                id="contact-ownerId"
                value={values.ownerId}
                onChange={set("ownerId")}
                people={people}
              />
            </Field>
          </div>
          <Field id="contact-notes" label="Notes" error={errors.notes}>
            <Textarea {...input("notes")} rows={3} />
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : contact ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
