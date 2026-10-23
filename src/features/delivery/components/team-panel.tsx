"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Person } from "@/components/dashboard/shared/person";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { PersonSelect } from "@/features/crm/components/owner-select";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMinor, minorToInput } from "@/lib/money";
import { addMember, removeMember, setMemberCostRate } from "../actions/projects";
import { formatMinutes } from "../rules";
import type { MemberView, PersonRef } from "../types";

type Editing = { kind: "add" } | { kind: "rate"; member: MemberView } | null;

/** Who works on the project and what an hour of each costs. The cost rate is for budget figures only. */
export function TeamPanel({
  projectId,
  currency,
  members,
  people,
  managerId,
}: {
  projectId: string;
  currency: string;
  members: MemberView[];
  people: PersonRef[];
  managerId?: string;
}) {
  const router = useRouter();
  const canUpdate = useCan("projects:update");
  const { run, pending } = useServerAction();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<MemberView | null>(null);
  const [profileId, setProfileId] = useState("");
  const [rate, setRate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const taken = new Set(members.map((member) => member.profileId));
  const available = people.filter((person) => !taken.has(person.id));

  function open(next: Editing) {
    setErrors({});
    setProfileId("");
    setRate(next?.kind === "rate" ? minorToInput(next.member.costRateMinor ?? null, currency) : "");
    setEditing(next);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setErrors({});
    const done = {
      success: editing.kind === "add" ? "Added to the team." : "Hourly cost updated.",
      onSuccess: () => {
        setEditing(null);
        router.refresh();
      },
      onFieldErrors: setErrors,
    };
    if (editing.kind === "add") {
      run(() => addMember({ projectId, profileId, costRate: rate }), done);
    } else {
      run(() => setMemberCostRate({ id: editing.member.id, costRate: rate }), done);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            Only people on the team can be given tasks or log hours here.
          </CardDescription>
        </div>
        {canUpdate && (
          <Button size="sm" onClick={() => open({ kind: "add" })} disabled={available.length === 0}>
            <Plus aria-hidden="true" /> Add someone
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <EmptyState
            compact
            icon={UserRound}
            title="No one on the team yet"
            description="Add the people who will work on this project."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Person name={member.name} avatarUrl={member.avatarUrl} />
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {member.profileId === managerId && "Manager · "}
                    {member.costRateMinor !== undefined
                      ? `${formatMinor(member.costRateMinor, currency)} an hour`
                      : "No hourly cost set"}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {formatMinutes(member.loggedMinutes)} logged
                </span>
                {canUpdate && (
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Change ${member.name}'s hourly cost`}
                      onClick={() => open({ kind: "rate", member })}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${member.name} from the team`}
                      disabled={pending || member.profileId === managerId}
                      onClick={() => setRemoving(member)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={editing !== null}
        onOpenChange={(next) => !next && !pending && setEditing(null)}
      >
        <DialogContent>
          {editing && (
            <form onSubmit={save} noValidate className="grid gap-4">
              <DialogHeader>
                <DialogTitle>
                  {editing.kind === "add"
                    ? "Add to the team"
                    : `Hourly cost of ${editing.member.name}`}
                </DialogTitle>
                <DialogDescription>
                  The hourly cost is what an hour of their time costs the company. It feeds the cost
                  figures, and is never shown to the client.
                </DialogDescription>
              </DialogHeader>
              {editing.kind === "add" && (
                <Field id="member-profile" label="Person" required error={errors.profileId}>
                  <PersonSelect
                    id="member-profile"
                    value={profileId}
                    onChange={setProfileId}
                    people={available}
                    noneLabel="Choose a person"
                  />
                </Field>
              )}
              <Field id="member-rate" label="Cost per hour (₱)" error={errors.costRate}>
                <Input
                  id="member-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="e.g. 350"
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || (editing.kind === "add" && !profileId)}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Remove ${removing?.name ?? "this person"}?`}
        description="They can no longer be given tasks or log hours on this project. Hours they already logged stay."
        confirmLabel="Remove"
        destructive
        pending={pending}
        onConfirm={() =>
          removing &&
          run(() => removeMember(removing.id), {
            success: "Removed from the team.",
            onSuccess: () => {
              setRemoving(null);
              router.refresh();
            },
          })
        }
      />
    </Card>
  );
}
