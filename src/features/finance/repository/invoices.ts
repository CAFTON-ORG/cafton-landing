import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import {
  agingBucket,
  balanceOf,
  stateOf,
  type InvoiceState,
  type InvoiceStatus,
  type PaymentMethod,
} from "../rules/invoicing";
import { resolveRate } from "../rules/billing";
import { EMPTY_TOTAL, addTo, type StateTotal } from "../rules/display";
import type { BillableTimeProject } from "../types/invoice-repository";
import { getFinanceSettings, listBillingRates, rateSourcesFor } from "./settings";
import type {
  AgingRow,
  BillableMilestone,
  CreditNoteView,
  InvoiceDetail,
  InvoiceRow,
  OpenInvoice,
  PaymentRow,
  PaymentView,
} from "../types/invoices";

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : undefined);
const num = (value: bigint | null | undefined) => Number(value ?? 0);

interface Standing {
  settledMinor: number;
  creditedMinor: number;
}

/** What has been paid and credited against each invoice (voided payments and credit notes don't count). */
export async function standings(ids: string[]): Promise<Map<string, Standing>> {
  const map = new Map<string, Standing>(
    ids.map((id) => [id, { settledMinor: 0, creditedMinor: 0 }]),
  );
  if (ids.length === 0) return map;
  const [paid, credited] = await Promise.all([
    prisma.paymentAllocation.groupBy({
      by: ["invoiceId"],
      where: { invoiceId: { in: ids }, payment: { status: "recorded" } },
      _sum: { amountMinor: true },
    }),
    prisma.creditNote.groupBy({
      by: ["invoiceId"],
      where: { invoiceId: { in: ids }, status: "issued" },
      _sum: { totalMinor: true },
    }),
  ]);
  for (const row of paid) map.get(row.invoiceId)!.settledMinor = num(row._sum.amountMinor);
  for (const row of credited) map.get(row.invoiceId)!.creditedMinor = num(row._sum.totalMinor);
  return map;
}

const include = { project: { select: { name: true } } } satisfies Prisma.InvoiceInclude;
type Full = Prisma.InvoiceGetPayload<{ include: typeof include }>;

function toRow(row: Full, standing: Standing, today: string): InvoiceRow {
  const totalMinor = num(row.totalMinor);
  const full = {
    totalMinor,
    ...standing,
    status: row.status as InvoiceStatus,
    dueDate: day(row.dueDate) ?? null,
  };
  return {
    id: row.id,
    number: row.number ?? undefined,
    status: row.status as InvoiceStatus,
    state: stateOf(full, today),
    clientName: row.clientName,
    organizationId: row.organizationId ?? undefined,
    issueDate: day(row.issueDate),
    dueDate: day(row.dueDate),
    totalMinor,
    balanceMinor: row.status === "issued" ? balanceOf(full) : 0,
    projectId: row.projectId ?? undefined,
    projectName: row.project?.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listInvoices(params: TableParams, today: string): Promise<Page<InvoiceRow>> {
  const empty: Page<InvoiceRow> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize,
    pageCount: 1,
  };
  if (!isDatabaseConfigured) return empty;

  const state = params.filters.state as InvoiceState | "";
  const q = params.q.trim();
  const where: Prisma.InvoiceWhereInput = {
    ...(state === "draft"
      ? { status: "draft" }
      : state === "void"
        ? { status: "void" }
        : state
          ? { status: "issued" }
          : {}),
    ...(params.filters.project ? { projectId: params.filters.project } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
            { project: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.InvoiceOrderByWithRelationInput =
    params.sort === "number"
      ? { number: { sort: dir, nulls: "last" } }
      : params.sort === "due"
        ? { dueDate: { sort: dir, nulls: "last" } }
        : params.sort === "total"
          ? { totalMinor: dir }
          : { createdAt: dir };

  // Where an invoice stands depends on payments, so a state filter is applied after reading them.
  const needsState =
    state === "open" ||
    state === "partial" ||
    state === "overdue" ||
    state === "paid" ||
    (state as string) === "awaiting";
  if (needsState) {
    const all = await prisma.invoice.findMany({ where, include, orderBy, take: 2000 });
    const stand = await standings(all.map((row) => row.id));
    const rows = all
      .map((row) => toRow(row, stand.get(row.id)!, today))
      .filter((row) =>
        (state as string) === "awaiting"
          ? row.state === "open" || row.state === "partial"
          : row.state === state,
      );
    const base = paginate(rows, params.page, params.pageSize);
    return {
      ...base,
      items: rows.slice((base.page - 1) * base.pageSize, base.page * base.pageSize),
    };
  }

  const total = await prisma.invoice.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.invoice.findMany({
    where,
    include,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const stand = await standings(rows.map((row) => row.id));
  return { ...base, items: rows.map((row) => toRow(row, stand.get(row.id)!, today)) };
}

const toPayment = (row: Prisma.PaymentGetPayload<object>, appliedMinor?: number): PaymentView => ({
  id: row.id,
  number: row.number,
  receivedDate: day(row.receivedDate) as string,
  amountMinor: num(row.amountMinor),
  cwtMinor: num(row.cwtMinor),
  method: row.method as PaymentMethod,
  reference: row.reference ?? undefined,
  clientName: row.clientName,
  status: row.status as "recorded" | "void",
  appliedMinor,
  journalEntryId: row.journalEntryId,
  voidReason: row.voidReason ?? undefined,
});

const toCredit = (row: Prisma.CreditNoteGetPayload<object>): CreditNoteView => ({
  id: row.id,
  number: row.number,
  issueDate: day(row.issueDate) as string,
  reason: row.reason,
  subtotalMinor: num(row.subtotalMinor),
  taxMinor: num(row.taxMinor),
  totalMinor: num(row.totalMinor),
  status: row.status as "issued" | "void",
  journalEntryId: row.journalEntryId,
});

export async function getInvoice(id: string, today: string): Promise<InvoiceDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.invoice
    .findUnique({
      where: { id },
      include: {
        ...include,
        deal: { select: { title: true } },
        quote: { select: { reference: true } },
        lines: { orderBy: { position: "asc" }, include: { milestone: { select: { id: true } } } },
        allocations: { include: { payment: true }, orderBy: { payment: { receivedDate: "asc" } } },
        creditNotes: { orderBy: { createdAt: "asc" } },
      },
    })
    .catch(() => null);
  if (!row) return null;
  const stand = (await standings([id])).get(id)!;
  return {
    ...toRow(row, stand, today),
    contactId: row.contactId ?? undefined,
    clientEmail: row.clientEmail ?? undefined,
    clientAddress: row.clientAddress ?? undefined,
    clientTin: row.clientTin ?? undefined,
    dealId: row.dealId ?? undefined,
    dealTitle: row.deal?.title,
    quoteId: row.quoteId ?? undefined,
    quoteReference: row.quote?.reference,
    taxCode: row.taxCode,
    taxRateBp: row.taxRateBp,
    subtotalMinor: num(row.subtotalMinor),
    taxMinor: num(row.taxMinor),
    notes: row.notes ?? undefined,
    paymentInstructions: row.paymentInstructions ?? undefined,
    journalEntryId: row.journalEntryId ?? undefined,
    sentAt: row.sentAt?.toISOString(),
    sentTo: row.sentTo ?? undefined,
    reminderCount: row.reminderCount,
    lastReminderAt: row.lastReminderAt?.toISOString(),
    voidedAt: row.voidedAt?.toISOString(),
    voidReason: row.voidReason ?? undefined,
    settledMinor: stand.settledMinor,
    creditedMinor: stand.creditedMinor,
    lines: row.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantityMilli: line.quantityMilli,
      unitLabel: line.unitLabel,
      unitPriceMinor: num(line.unitPriceMinor),
      amountMinor: num(line.amountMinor),
      taxable: line.taxable,
      milestoneId: line.milestone?.id,
    })),
    payments: row.allocations.map((allocation) =>
      toPayment(allocation.payment, num(allocation.amountMinor)),
    ),
    creditNotes: row.creditNotes.map(toCredit),
  };
}

/** Issued invoices still owed on, oldest due date first: what a payment can be put against. */
export async function listOpenInvoices(
  options: { organizationId?: string } = {},
): Promise<OpenInvoice[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.invoice.findMany({
    where: {
      status: "issued",
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { number: "asc" }],
  });
  const stand = await standings(rows.map((row) => row.id));
  return rows
    .map((row) => {
      const s = stand.get(row.id)!;
      return {
        id: row.id,
        number: row.number as string,
        clientName: row.clientName,
        organizationId: row.organizationId ?? undefined,
        dueDate: day(row.dueDate) as string,
        totalMinor: num(row.totalMinor),
        balanceMinor: balanceOf({ totalMinor: num(row.totalMinor), ...s }),
      };
    })
    .filter((row) => row.balanceMinor > 0);
}

export async function listPayments(limit = 200): Promise<PaymentRow[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.payment.findMany({
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { allocations: { include: { invoice: { select: { number: true } } } } },
  });
  return rows.map((row) => {
    const applied = row.allocations.reduce(
      (sum, allocation) => sum + num(allocation.amountMinor),
      0,
    );
    return {
      ...toPayment(row),
      unappliedMinor:
        row.status === "void" ? 0 : num(row.amountMinor) + num(row.cwtMinor) - applied,
      invoiceNumbers: row.allocations.map((allocation) => allocation.invoice.number ?? ""),
    };
  });
}

/** Money owed by clients, by how late it is: the receivables aging, as of `today`. */
export async function receivablesAging(today: string): Promise<AgingRow[]> {
  const open = await listOpenInvoices();
  const byClient = new Map<string, AgingRow>();
  for (const invoice of open) {
    const key = invoice.organizationId ?? invoice.clientName;
    const row =
      byClient.get(key) ??
      ({
        clientName: invoice.clientName,
        organizationId: invoice.organizationId,
        invoices: 0,
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90: 0,
        totalMinor: 0,
      } satisfies AgingRow);
    row.invoices += 1;
    row.totalMinor += invoice.balanceMinor;
    const bucket = agingBucket(invoice.dueDate, today);
    if (bucket === "current") row.current += invoice.balanceMinor;
    else if (bucket === "1-30") row.d1_30 += invoice.balanceMinor;
    else if (bucket === "31-60") row.d31_60 += invoice.balanceMinor;
    else if (bucket === "61-90") row.d61_90 += invoice.balanceMinor;
    else row.d90 += invoice.balanceMinor;
    byClient.set(key, row);
  }
  return [...byClient.values()].sort((a, b) => b.totalMinor - a.totalMinor);
}

/** Finished billable milestones that haven't been invoiced: what can be billed now. */
export async function listBillableMilestones(projectId?: string): Promise<BillableMilestone[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.milestone.findMany({
    where: {
      status: "done",
      billable: true,
      invoiceLineId: null,
      amountMinor: { gt: 0 },
      project: { deletedAt: null, ...(projectId ? { id: projectId } : {}) },
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ project: { name: "asc" } }, { position: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project.id,
    projectName: row.project.name,
    name: row.name,
    amountMinor: num(row.amountMinor),
  }));
}

/** Accepted quotes that haven't been turned into an invoice yet. */
export async function listInvoiceableQuotes(): Promise<
  { id: string; reference: string; title: string; clientName: string; totalMinor: number }[]
> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.quote.findMany({
    where: { status: "accepted", invoices: { none: { status: { not: "void" } } } },
    include: {
      deal: {
        select: {
          contact: { select: { firstName: true, lastName: true } },
          organization: { select: { name: true } },
        },
      },
    },
    orderBy: { acceptedAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.title,
    clientName:
      row.deal.organization?.name ??
      `${row.deal.contact.firstName} ${row.deal.contact.lastName}`.trim(),
    totalMinor: num(row.totalMinor),
  }));
}

/** Projects with approved, billable time nobody has invoiced yet, and what each person's hour would bill at. */
export async function listBillableTime(): Promise<BillableTimeProject[]> {
  if (!isDatabaseConfigured) return [];
  const entries = await prisma.timeEntry.findMany({
    where: {
      status: "approved",
      billable: true,
      invoiceLineId: null,
      project: { deletedAt: null },
    },
    select: { projectId: true, profileId: true, minutes: true, workDate: true },
    take: 10_000,
  });
  if (entries.length === 0) return [];
  const [projects, people, rates, settings] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: [...new Set(entries.map((e) => e.projectId))] } },
      select: { id: true, name: true },
    }),
    prisma.profile.findMany({
      where: { id: { in: [...new Set(entries.map((e) => e.profileId))] } },
      select: { id: true, fullName: true, email: true },
    }),
    listBillingRates(),
    getFinanceSettings(),
  ]);
  const byProject = new Map<string, BillableTimeProject>();
  for (const entry of entries) {
    const project = projects.find((p) => p.id === entry.projectId);
    if (!project) continue;
    const row =
      byProject.get(project.id) ??
      ({
        projectId: project.id,
        projectName: project.name,
        minutes: 0,
        latestDate: "",
        people: [],
      } as BillableTimeProject);
    row.minutes += entry.minutes;
    const date = day(entry.workDate) as string;
    if (date > row.latestDate) row.latestDate = date;
    let person = row.people.find((p) => p.profileId === entry.profileId);
    if (!person) {
      const profile = people.find((p) => p.id === entry.profileId);
      const rate = resolveRate(
        rateSourcesFor(rates, settings.defaultHourlyRateMinor, project.id, entry.profileId),
      );
      person = {
        profileId: entry.profileId,
        name: profile?.fullName ?? profile?.email ?? "Someone",
        minutes: 0,
        rateMinor: rate?.rateMinor ?? null,
        source: rate?.source ?? null,
      };
      row.people.push(person);
    }
    person.minutes += entry.minutes;
    byProject.set(project.id, row);
  }
  return [...byProject.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
}

export interface InvoiceSummary {
  /** Issued invoices still owed on, as of today. */
  awaiting: StateTotal;
  overdue: StateTotal;
  /** Paid in full, over the last 30 days of issue dates. */
  paidRecently: StateTotal;
  draft: StateTotal;
  counts: Record<"all" | "draft" | "awaiting" | "overdue" | "paid" | "void", number>;
}

/** The headline numbers above the invoice list, and how many invoices each tab holds. */
export async function invoiceSummary(today: string): Promise<InvoiceSummary> {
  const empty: InvoiceSummary = {
    awaiting: EMPTY_TOTAL,
    overdue: EMPTY_TOTAL,
    paidRecently: EMPTY_TOTAL,
    draft: EMPTY_TOTAL,
    counts: { all: 0, draft: 0, awaiting: 0, overdue: 0, paid: 0, void: 0 },
  };
  if (!isDatabaseConfigured) return empty;
  const rows = await prisma.invoice.findMany({ include, take: 5000 });
  const stand = await standings(rows.filter((row) => row.status === "issued").map((row) => row.id));
  const recent = new Date(`${today}T00:00:00Z`).getTime() - 30 * 86_400_000;
  const out = { ...empty, counts: { ...empty.counts } };
  for (const row of rows) {
    const view = toRow(row, stand.get(row.id) ?? { settledMinor: 0, creditedMinor: 0 }, today);
    out.counts.all += 1;
    if (view.state === "draft") {
      out.counts.draft += 1;
      out.draft = addTo(out.draft, view.totalMinor);
    } else if (view.state === "void") out.counts.void += 1;
    else if (view.state === "paid") {
      out.counts.paid += 1;
      if (row.issueDate && row.issueDate.getTime() >= recent)
        out.paidRecently = addTo(out.paidRecently, view.totalMinor);
    } else {
      // open, partly paid or overdue: all of it is awaiting payment, and the late part is overdue too.
      out.counts.awaiting += 1;
      out.awaiting = addTo(out.awaiting, view.balanceMinor);
      if (view.state === "overdue") {
        out.counts.overdue += 1;
        out.overdue = addTo(out.overdue, view.balanceMinor);
      }
    }
  }
  return out;
}
