"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogBody,
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
import { createOrganization, updateOrganization } from "../actions/contacts";
import type { OrganizationView } from "../types";

export function OrganizationDialog({
  organization,
  trigger,
}: {
  organization?: OrganizationView;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();
  const initial = {
    name: organization?.name ?? "",
    industry: organization?.industry ?? "",
    size: organization?.size ?? "",
    website: organization?.website ?? "",
    phone: organization?.phone ?? "",
    address: organization?.address ?? "",
    notes: organization?.notes ?? "",
  };
  const [values, setValues] = useState(initial);
  const input = (key: keyof typeof initial) => ({
    id: `org-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value })),
    "aria-invalid": !!errors[key],
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(
      () =>
        organization ? updateOrganization(organization.id, values) : createOrganization(values),
      {
        success: organization ? "Organization updated." : "Organization added.",
        onSuccess: (data) => {
          setOpen(false);
          if (!organization) {
            setValues(initial);
            const created = data as { id: string } | undefined;
            if (created?.id) router.push(`/dashboard/crm/organizations/${created.id}`);
          }
        },
        onFieldErrors: setErrors,
      },
    );
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
      <DialogContent scrollable className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{organization ? "Edit organization" : "Add an organization"}</DialogTitle>
            <DialogDescription>A company, school or group you work with.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="org-name" label="Name" required error={errors.name}>
              <Input {...input("name")} autoComplete="off" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="org-industry" label="Industry" error={errors.industry}>
                <Input {...input("industry")} />
              </Field>
              <Field id="org-size" label="Size" error={errors.size}>
                <Input {...input("size")} placeholder="e.g. 11-50 employees" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="org-website" label="Website" error={errors.website}>
                <Input {...input("website")} type="url" placeholder="https://example.com" />
              </Field>
              <Field id="org-phone" label="Phone" error={errors.phone}>
                <Input {...input("phone")} type="tel" />
              </Field>
            </div>
            <Field id="org-address" label="Address" error={errors.address}>
              <Input {...input("address")} />
            </Field>
            <Field id="org-notes" label="Notes" error={errors.notes}>
              <Textarea {...input("notes")} rows={3} />
            </Field>
          </DialogBody>
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
              {pending ? "Saving…" : organization ? "Save changes" : "Add organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
