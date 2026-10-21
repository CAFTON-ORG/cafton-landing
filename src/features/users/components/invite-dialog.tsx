"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/dashboard/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/dashboard/ui/select";
import { inviteUser } from "../actions";
import type { RoleOption } from "../types";

export function InviteDialog({ roles }: { roles: RoleOption[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function reset() {
    setEmail("");
    setRoleId("");
    setErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await inviteUser({ email, roleId });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(`Invited ${email}. They can now sign in with that Google account.`);
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlus aria-hidden="true" /> Invite person
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite a person</DialogTitle>
            <DialogDescription>
              They sign in with this Google account at /login and get the role you choose.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "invite-email-error" : undefined}
              placeholder="name@cafton.com"
            />
            {errors.email && (
              <p id="invite-email-error" className="text-destructive text-sm">
                {errors.email}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={roleId} onValueChange={(value) => setRoleId(String(value))}>
              <SelectTrigger id="invite-role" aria-invalid={!!errors.roleId} className="w-full">
                <SelectValue placeholder="Choose a role">
                  {(value: string) => roles.find((role) => role.id === value)?.name ?? "Choose a role"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-destructive text-sm">{errors.roleId}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Inviting…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
