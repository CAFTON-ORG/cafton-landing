"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { notify } from "@/features/notifications/server";
import { manilaDate } from "@/features/schedule/slots";
import { TOKEN_SHAPE, hashToken } from "@/features/sales/integrity";
import { ActionError, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { emit } from "@/lib/events";
import { sendMail } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { checkRespond, CONTRACT_KIND_LABEL, type ContractStatus } from "./rules";
import { respondSchema, type RespondInput } from "./schemas";
import { fingerprintOf } from "./server";

/** The system acting for a client who used the public link: there is no staff member to name. */
const CLIENT = { id: "client-link", name: "Client (public contract link)" };

async function caller() {
  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
  return { ip, userAgent: (list.get("user-agent") ?? "").slice(0, 300) };
}

/** Marks the contract as seen the first time the link is opened (so staff know it reached them). */
export async function markContractViewed(token: string) {
  if (!TOKEN_SHAPE.test(token)) return;
  const contract = await prisma.contract.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      viewedAt: true,
      status: true,
      reference: true,
      createdBy: true,
      deal: { select: { ownerId: true } },
    },
  });
  if (!contract || contract.viewedAt || contract.status !== "sent") return;
  await prisma.contract.update({ where: { id: contract.id }, data: { viewedAt: new Date() } });
  await notify([contract.createdBy, contract.deal.ownerId], {
    kind: "contract.viewed",
    title: `${contract.reference} was opened`,
    href: `/dashboard/sales/contracts/${contract.id}`,
  });
}

/**
 * The client's answer from the public link. Signing records who agreed (the name they typed, when,
 * from which address and browser, and a fingerprint of the exact wording) so it stands as an
 * e-signature under the Philippine Electronic Commerce Act. It cannot be changed afterwards.
 */
export async function respondToContract(
  input: RespondInput,
): Promise<ActionResult<{ status: ContractStatus }>> {
  return runAction(async () => {
    const data = parse(respondSchema, input);
    const who = await caller();
    const limit = checkRateLimit(`contract-reply:${who.ip}`, { limit: 12, windowMs: 10 * 60_000 });
    if (!limit.allowed) throw new ActionError("Too many tries. Please wait a few minutes.");

    if (!TOKEN_SHAPE.test(data.token)) throw new ActionError("This link isn't valid any more.");
    const contract = await prisma.contract.findUnique({
      where: { tokenHash: hashToken(data.token) },
      include: {
        deal: {
          select: {
            ownerId: true,
            stage: { select: { kind: true } },
            contact: { select: { email: true } },
          },
        },
      },
    });
    if (!contract) throw new ActionError("This link isn't valid any more.");
    const blocked = checkRespond(
      {
        status: contract.status as ContractStatus,
        validUntil: contract.validUntil ? contract.validUntil.toISOString().slice(0, 10) : null,
      },
      manilaDate(new Date()),
    );
    if (blocked) throw new ActionError(blocked, "rule");
    // Proof that nothing changed since it was sent: what is stored must match what was fingerprinted.
    const proof = fingerprintOf(contract);
    if (!contract.sentHash || contract.sentHash !== proof) {
      throw new ActionError(
        "This contract has changed since it was sent. Please ask us for the latest one.",
        "rule",
      );
    }
    if (contract.deal.stage.kind === "lost") {
      throw new ActionError("This offer is no longer open. Please contact us.", "rule");
    }

    const now = new Date();
    const status: ContractStatus = data.action === "accept" ? "accepted" : "declined";
    const kindLabel = CONTRACT_KIND_LABEL[contract.kind];

    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: two answers at once must not both win.
      const claimed = await tx.contract.updateMany({
        where: { id: contract.id, status: "sent" },
        data:
          data.action === "accept"
            ? {
                status: "accepted",
                acceptedAt: now,
                acceptedByName: data.name,
                acceptedByEmail: data.email ?? null,
                acceptedIp: who.ip,
                acceptedUserAgent: who.userAgent,
                acceptedHash: proof,
              }
            : { status: "declined", declinedAt: now, declinedReason: data.reason },
      });
      if (claimed.count === 0) throw new ActionError("This contract was just answered.", "rule");

      await tx.activity.create({
        data: {
          type: "system",
          body:
            data.action === "accept"
              ? `${kindLabel} ${contract.reference} was signed by ${data.name}`
              : `${kindLabel} ${contract.reference} was declined: ${data.reason}`,
          dealId: contract.dealId,
          createdByName: CLIENT.name,
        },
      });
      await recordAudit(
        CLIENT,
        {
          action: data.action === "accept" ? "contract.accept" : "contract.decline",
          entity: "contract",
          entityId: contract.id,
          summary:
            data.action === "accept"
              ? `${data.name} signed ${contract.reference}`
              : `${contract.reference} was declined`,
          metadata:
            data.action === "accept"
              ? { ip: who.ip, userAgent: who.userAgent, hash: proof }
              : { reason: data.reason },
        },
        tx,
      );
    });

    await notify([contract.createdBy, contract.deal.ownerId], {
      kind: data.action === "accept" ? "contract.accepted" : "contract.declined",
      title:
        data.action === "accept"
          ? `${contract.reference} was signed`
          : `${contract.reference} was declined`,
      body: data.action === "accept" ? `Signed by ${data.name}.` : data.reason,
      href: `/dashboard/sales/contracts/${contract.id}`,
    });

    if (data.action === "accept") {
      const to = data.email || contract.deal.contact.email;
      if (to) {
        const { html, text } = renderEmail({
          title: "Thank you, your agreement is signed",
          paragraphs: [
            `Hi ${data.name.split(" ")[0]}, we received your signature on ${contract.reference}.`,
            "Keep this email as your record. We will be in touch shortly about the next steps.",
          ],
          facts: [
            ["Document", contract.reference],
            ["Signed by", data.name],
            ["When", now.toISOString()],
          ],
        });
        await sendMail({ to, subject: `Signed: ${contract.reference}`, text, html });
      }
      await emit("contract.accepted", {
        contractId: contract.id,
        reference: contract.reference,
        dealId: contract.dealId,
        quoteId: contract.quoteId ?? undefined,
        kind: contract.kind,
        acceptedByName: data.name,
      });
    }

    revalidatePath(`/dashboard/crm/deals/${contract.dealId}`);
    revalidatePath("/dashboard/sales/contracts");
    revalidatePath(`/c/${data.token}`);
    return { status };
  });
}
