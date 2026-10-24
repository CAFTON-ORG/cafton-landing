import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fullName } from "../rules/core";
import { asValues } from "../rules/custom-fields";
import { bandOf, scoreLead } from "../rules/scoring";
import type {
  ContactView,
  DealView,
  LeadView,
  OrganizationView,
  PersonRef,
  StageView,
} from "../types/core";

/** Soft-deleted rows are invisible everywhere. */
export const live = { deletedAt: null } as const;

const iso = (date: Date) => date.toISOString();
const day = (date: Date) => date.toISOString().slice(0, 10);

/** Staff referenced by a page of records, by id: their name and photo. */
export type People = Map<string, PersonRef>;

export async function namesFor(ids: (string | null | undefined)[]): Promise<People> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return new Map();
  const people = await prisma.profile.findMany({
    where: { id: { in: unique } },
    select: { id: true, fullName: true, email: true, avatarUrl: true },
  });
  return new Map(
    people.map((person) => [
      person.id,
      {
        id: person.id,
        name: person.fullName || person.email,
        avatarUrl: person.avatarUrl ?? undefined,
      },
    ]),
  );
}

export function toStage(stage: Prisma.PipelineStageGetPayload<object>): StageView {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    key: stage.key,
    name: stage.name,
    position: stage.position,
    probability: stage.probability,
    kind: stage.kind,
    exitCriteria: stage.exitCriteria ?? undefined,
    requiredFields: stage.requiredFields,
  };
}

export function toLead(
  lead: Prisma.LeadGetPayload<{ include: { deal: { select: { id: true } } } }>,
  names: People,
): LeadView {
  // The stored score is what lists sort by; the breakdown is always recomputed from the lead's own
  // answers, so "why" is available even before the daily job has stored a score.
  const scored = scoreLead({
    budget: lead.budget,
    timeline: lead.timeline,
    phone: lead.phone,
    email: lead.email,
    businessName: lead.businessName,
    answers:
      lead.answers && typeof lead.answers === "object" && !Array.isArray(lead.answers)
        ? (lead.answers as Record<string, unknown>)
        : null,
  });
  const score = lead.score ?? scored.score;
  return {
    id: lead.id,
    custom: asValues(lead.custom),
    tags: lead.tags,
    reference: lead.reference,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: fullName(lead),
    email: lead.email,
    phone: lead.phone ?? undefined,
    businessName: lead.businessName ?? undefined,
    goalsArea: lead.goalsArea ?? undefined,
    budget: lead.budget ?? undefined,
    timeline: lead.timeline ?? undefined,
    source: lead.source,
    pagePath: lead.pagePath ?? undefined,
    status: lead.status,
    disqualifiedReason: lead.disqualifiedReason ?? undefined,
    ownerId: lead.ownerId ?? undefined,
    ownerName: lead.ownerId ? names.get(lead.ownerId)?.name : undefined,
    ownerAvatar: lead.ownerId ? names.get(lead.ownerId)?.avatarUrl : undefined,
    contactId: lead.contactId ?? undefined,
    dealId: lead.deal?.id,
    createdAt: iso(lead.createdAt),
    score,
    scoreBand: bandOf(score),
    scoreReasons: scored.reasons,
  };
}

export function toOrganization(
  org: Prisma.OrganizationGetPayload<{
    include: { _count: { select: { contacts: true; deals: true } } };
  }>,
): OrganizationView {
  return {
    id: org.id,
    custom: asValues(org.custom),
    tags: org.tags,
    name: org.name,
    industry: org.industry ?? undefined,
    size: org.size ?? undefined,
    website: org.website ?? undefined,
    phone: org.phone ?? undefined,
    address: org.address ?? undefined,
    notes: org.notes ?? undefined,
    contactCount: org._count.contacts,
    dealCount: org._count.deals,
    createdAt: iso(org.createdAt),
  };
}

export function toContact(
  contact: Prisma.ContactGetPayload<{
    include: { organization: { select: { name: true } }; _count: { select: { deals: true } } };
  }>,
  names: People,
): ContactView {
  return {
    id: contact.id,
    custom: asValues(contact.custom),
    tags: contact.tags,
    firstName: contact.firstName,
    lastName: contact.lastName,
    name: fullName(contact),
    email: contact.email,
    phone: contact.phone ?? undefined,
    position: contact.position ?? undefined,
    organizationId: contact.organizationId ?? undefined,
    organizationName: contact.organization?.name,
    ownerId: contact.ownerId ?? undefined,
    ownerName: contact.ownerId ? names.get(contact.ownerId)?.name : undefined,
    ownerAvatar: contact.ownerId ? names.get(contact.ownerId)?.avatarUrl : undefined,
    source: contact.source,
    notes: contact.notes ?? undefined,
    dealCount: contact._count.deals,
    createdAt: iso(contact.createdAt),
  };
}

export const dealInclude = {
  stage: true,
  contact: { select: { id: true, firstName: true, lastName: true } },
  organization: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;

export function toDeal(
  deal: Prisma.DealGetPayload<{ include: typeof dealInclude }>,
  names: People,
): DealView {
  return {
    id: deal.id,
    custom: asValues(deal.custom),
    tags: deal.tags,
    reference: deal.reference,
    title: deal.title,
    contactId: deal.contactId,
    contactName: fullName(deal.contact),
    organizationId: deal.organizationId ?? undefined,
    organizationName: deal.organization?.name,
    stageId: deal.stageId,
    pipelineId: deal.stage.pipelineId,
    stageKey: deal.stage.key,
    stageName: deal.stage.name,
    stageKind: deal.stage.kind,
    probability: deal.stage.probability,
    // BigInt does not cross the server/client boundary; centavos fit a double exactly up to 2^53.
    amountMinor: deal.amountMinor === null ? null : Number(deal.amountMinor),
    currency: deal.currency,
    ownerId: deal.ownerId ?? undefined,
    ownerName: deal.ownerId ? names.get(deal.ownerId)?.name : undefined,
    ownerAvatar: deal.ownerId ? names.get(deal.ownerId)?.avatarUrl : undefined,
    expectedCloseDate: deal.expectedCloseDate ? day(deal.expectedCloseDate) : undefined,
    source: deal.source,
    description: deal.description ?? undefined,
    lostReason: deal.lostReason ?? undefined,
    leadId: deal.leadId ?? undefined,
    stageChangedAt: iso(deal.stageChangedAt),
    wonAt: deal.wonAt ? iso(deal.wonAt) : undefined,
    lostAt: deal.lostAt ? iso(deal.lostAt) : undefined,
    createdAt: iso(deal.createdAt),
  };
}
