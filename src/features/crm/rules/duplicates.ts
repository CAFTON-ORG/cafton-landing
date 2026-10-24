/**
 * Finding records that are probably the same person or company, and what a merge keeps.
 * Pure: shared by the page that lists them, the merge action, and unit tests.
 */

/** Digits only; a Philippine number is compared by its last 10 digits (0917… equals +63917…). */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

const COMPANY_NOISE = /\b(inc|incorporated|corp|corporation|co|company|ltd|llc|the|and|of)\b/g;

/** "Acme, Inc." and "ACME Corporation" are the same company. */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(COMPANY_NOISE, " ")
    .replace(/\s+/g, "")
    .trim();
}

export function domainOf(website: string | null | undefined): string | null {
  const text = (website ?? "").trim().toLowerCase();
  if (!text) return null;
  const host = text
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  return host.includes(".") ? host : null;
}

export interface ContactCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  organizationId?: string | null;
}

export interface OrganizationCandidate {
  id: string;
  name: string;
  website?: string | null;
}

export interface DuplicateGroup<T> {
  /** Why they look the same. */
  reasons: string[];
  members: T[];
}

/** Groups items that share any key; groups that overlap are joined (a, b share a phone; b, c a name -> one group). */
function group<T extends { id: string }>(
  items: readonly T[],
  keysOf: (item: T) => { reason: string; key: string }[],
): DuplicateGroup<T>[] {
  const parent = new Map(items.map((item) => [item.id, item.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const reasons = new Map<string, Set<string>>();
  const seen = new Map<string, string>();
  for (const item of items) {
    for (const { reason, key } of keysOf(item)) {
      const known = seen.get(key);
      if (known === undefined) seen.set(key, item.id);
      else {
        parent.set(find(item.id), find(known));
        const root = find(known);
        reasons.set(root, (reasons.get(root) ?? new Set()).add(reason));
      }
    }
  }
  const byRoot = new Map<string, T[]>();
  for (const item of items) byRoot.set(find(item.id), [...(byRoot.get(find(item.id)) ?? []), item]);
  return [...byRoot.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([root, members]) => {
      // Reasons were recorded against intermediate roots: gather every one that landed in this group.
      const joined = new Set<string>();
      for (const [recorded, set] of reasons)
        if (find(recorded) === root) set.forEach((r) => joined.add(r));
      return { reasons: [...joined], members };
    });
}

export function findContactDuplicates<T extends ContactCandidate>(
  contacts: readonly T[],
): DuplicateGroup<T>[] {
  return group(contacts, (contact) => {
    const keys: { reason: string; key: string }[] = [
      { reason: "the same email", key: `e:${contact.email.toLowerCase()}` },
    ];
    const phone = normalizePhone(contact.phone);
    if (phone) keys.push({ reason: "the same phone number", key: `p:${phone}` });
    const name = `${contact.firstName} ${contact.lastName}`
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (contact.lastName.trim()) {
      keys.push({
        reason: contact.organizationId ? "the same name at the same organization" : "the same name",
        key: `n:${name}:${contact.organizationId ?? ""}`,
      });
    }
    return keys;
  });
}

export interface LeadCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
}

/** Leads that look like the same enquirer: the same email, phone, or name at the same business. */
export function findLeadDuplicates<T extends LeadCandidate>(
  leads: readonly T[],
): DuplicateGroup<T>[] {
  return group(leads, (lead) => {
    const keys: { reason: string; key: string }[] = [
      { reason: "the same email", key: `e:${lead.email.trim().toLowerCase()}` },
    ];
    const phone = normalizePhone(lead.phone);
    if (phone) keys.push({ reason: "the same phone number", key: `p:${phone}` });
    const name = `${lead.firstName} ${lead.lastName}`.toLowerCase().replace(/\s+/g, " ").trim();
    const business = normalizeCompany(lead.businessName ?? "");
    if (lead.lastName.trim() && business) {
      keys.push({ reason: "the same name at the same business", key: `n:${name}:${business}` });
    }
    return keys;
  });
}

export function findOrganizationDuplicates<T extends OrganizationCandidate>(
  organizations: readonly T[],
): DuplicateGroup<T>[] {
  return group(organizations, (org) => {
    const keys: { reason: string; key: string }[] = [];
    const company = normalizeCompany(org.name);
    if (company) keys.push({ reason: "a similar name", key: `c:${company}` });
    const domain = domainOf(org.website);
    if (domain) keys.push({ reason: "the same website", key: `d:${domain}` });
    return keys;
  });
}

/**
 * What the kept record ends up with: its own values first, then the first value any other record
 * has for a field it left empty. Tags are combined.
 */
export function mergeValues<T extends Record<string, unknown>, F extends keyof T>(
  primary: T,
  others: readonly T[],
  fields: readonly F[],
): Partial<Pick<T, F>> {
  const result: Partial<Pick<T, F>> = {};
  for (const field of fields) {
    const own = primary[field];
    if (own !== null && own !== undefined && own !== "") continue;
    const donor = others.find(
      (other) => other[field] !== null && other[field] !== undefined && other[field] !== "",
    );
    if (donor) result[field] = donor[field];
  }
  return result;
}
