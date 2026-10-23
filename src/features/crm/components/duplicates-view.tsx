"use client";

import { TabCount } from "@/components/dashboard/shared/tab-count";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, GitMerge, ShieldCheck } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Person } from "@/components/dashboard/shared/person";
import { Thumbnail } from "@/components/dashboard/shared/thumbnail";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { mergeContacts, mergeLeads, mergeOrganizations } from "../actions/merge";
import type { DuplicateGroup } from "../duplicates";
import type {
  DuplicateContact,
  DuplicateLead,
  DuplicateOrganization,
} from "../repository/duplicates";

/** Likely duplicates, with the one to keep chosen for you (the record with the most deals, else the oldest). */
export function DuplicatesView({
  leads,
  contacts,
  organizations,
}: {
  leads: DuplicateGroup<DuplicateLead>[];
  contacts: DuplicateGroup<DuplicateContact>[];
  organizations: DuplicateGroup<DuplicateOrganization>[];
}) {
  const canLeads = useCan("leads:merge");
  const canContacts = useCan("contacts:merge");
  const canOrganizations = useCan("organizations:merge");
  return (
    <Tabs defaultValue={canLeads ? "leads" : canContacts ? "contacts" : "organizations"}>
      <TabsList>
        {canLeads && (
          <TabsTrigger value="leads">
            Leads
            <TabCount n={leads.length} />
          </TabsTrigger>
        )}
        {canContacts && (
          <TabsTrigger value="contacts">
            Contacts
            <TabCount n={contacts.length} />
          </TabsTrigger>
        )}
        {canOrganizations && (
          <TabsTrigger value="organizations">
            Organizations
            <TabCount n={organizations.length} />
          </TabsTrigger>
        )}
      </TabsList>
      {canLeads && (
        <TabsContent value="leads" className="mt-4 grid gap-4">
          {leads.length === 0 && <Clean what="leads" />}
          {leads.map((group) => (
            <GroupCard
              key={group.members.map((m) => m.id).join()}
              group={group}
              bestOf={(a, b) => b.activityCount - a.activityCount}
              merge={(primaryId, otherIds) => mergeLeads({ primaryId, otherIds })}
              noun="lead"
              render={(m) => (
                <Person
                  name={m.name}
                  email={m.email}
                  secondary={[m.reference, m.email, m.phone, m.businessName]
                    .filter(Boolean)
                    .join(" · ")}
                />
              )}
              facts={(m) =>
                `${m.status} · ${m.activityCount} timeline ${m.activityCount === 1 ? "entry" : "entries"} · received ${formatDate(m.createdAt)}`
              }
            />
          ))}
        </TabsContent>
      )}
      {canContacts && (
        <TabsContent value="contacts" className="mt-4 grid gap-4">
          {contacts.length === 0 && <Clean what="contacts" />}
          {contacts.map((group) => (
            <GroupCard
              key={group.members.map((m) => m.id).join()}
              group={group}
              bestOf={(a, b) => b.dealCount - a.dealCount}
              merge={(primaryId, otherIds) => mergeContacts({ primaryId, otherIds })}
              noun="contact"
              render={(m) => (
                <Person
                  name={m.name}
                  email={m.email}
                  secondary={[m.email, m.phone, m.organizationName].filter(Boolean).join(" · ")}
                />
              )}
              facts={(m) =>
                `${m.dealCount} ${m.dealCount === 1 ? "deal" : "deals"} · added ${formatDate(m.createdAt)}`
              }
            />
          ))}
        </TabsContent>
      )}
      {canOrganizations && (
        <TabsContent value="organizations" className="mt-4 grid gap-4">
          {organizations.length === 0 && <Clean what="organizations" />}
          {organizations.map((group) => (
            <GroupCard
              key={group.members.map((m) => m.id).join()}
              group={group}
              bestOf={(a, b) => b.contactCount + b.dealCount - (a.contactCount + a.dealCount)}
              merge={(primaryId, otherIds) => mergeOrganizations({ primaryId, otherIds })}
              noun="organization"
              render={(m) => (
                <span className="flex min-w-0 items-center gap-2">
                  <Thumbnail icon={Building2} size="sm" />
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate">{m.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {[m.industry, m.website].filter(Boolean).join(" · ") || "No details"}
                    </span>
                  </span>
                </span>
              )}
              facts={(m) =>
                `${m.contactCount} contacts · ${m.dealCount} deals · added ${formatDate(m.createdAt)}`
              }
            />
          ))}
        </TabsContent>
      )}
    </Tabs>
  );
}

function Clean({ what }: { what: string }) {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={ShieldCheck}
          title="No duplicates found"
          description={`Your ${what} look clean. New ones are checked every time you open this page.`}
        />
      </CardContent>
    </Card>
  );
}

function GroupCard<T extends { id: string; createdAt: string }>({
  group,
  bestOf,
  merge,
  noun,
  render,
  facts,
}: {
  group: DuplicateGroup<T>;
  bestOf: (a: T, b: T) => number;
  merge: (
    primaryId: string,
    otherIds: string[],
  ) => Promise<import("@/lib/actions").ActionResult<{ id: string }>>;
  noun: string;
  render: (member: T) => React.ReactNode;
  facts: (member: T) => string;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const suggested = [...group.members].sort(
    (a, b) => bestOf(a, b) || a.createdAt.localeCompare(b.createdAt),
  )[0];
  const [keep, setKeep] = useState(suggested.id);
  const [confirming, setConfirming] = useState(false);
  const name = `dup-${group.members[0].id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {group.members.length} {noun}s that look the same
        </CardTitle>
        <CardDescription>
          Matched on {group.reasons.join(" and ") || "their details"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Which {noun} to keep</legend>
          {group.members.map((member) => (
            <label
              key={member.id}
              className="has-[:checked]:border-primary has-[:checked]:ring-primary flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:ring-1"
            >
              <input
                type="radio"
                name={name}
                value={member.id}
                checked={keep === member.id}
                onChange={() => setKeep(member.id)}
                className="accent-primary size-4"
              />
              <span className="min-w-0 flex-1">{render(member)}</span>
              <span className="text-muted-foreground hidden text-xs sm:block">
                {member.id === suggested.id && (
                  <strong className="text-foreground">Suggested · </strong>
                )}
                {facts(member)}
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <Button size="sm" disabled={pending} onClick={() => setConfirming(true)}>
            <GitMerge aria-hidden="true" /> Merge into the selected {noun}
          </Button>
        </div>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`Merge ${group.members.length} ${noun}s into one?`}
          description={`Everything linked to the others (deals, tasks, meetings, timeline) moves to the one you keep, gaps in its details are filled from the others, and the others are removed. This is recorded in the audit log.`}
          confirmLabel="Merge"
          pending={pending}
          onConfirm={() =>
            run(
              () =>
                merge(
                  keep,
                  group.members.map((m) => m.id).filter((id) => id !== keep),
                ),
              {
                success: "Merged.",
                onSuccess: () => {
                  setConfirming(false);
                  router.refresh();
                },
              },
            )
          }
        />
      </CardContent>
    </Card>
  );
}
