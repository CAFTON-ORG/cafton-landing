import "server-only";

/**
 * A tiny in-process event bus: one part of the system announces that something happened, and other
 * parts react without the first one importing them. A won quote will start a project (Phase 5) and
 * an invoice schedule (Phase 6) this way, so Sales never depends on Delivery or Finance.
 *
 * Handlers run after the change is saved, one at a time. A handler that throws is logged and never
 * undoes or blocks what happened.
 */

export interface DomainEvents {
  "quote.accepted": {
    quoteId: string;
    reference: string;
    dealId: string;
    totalMinor: number;
    currency: string;
    acceptedByName: string;
  };
  "contract.accepted": {
    contractId: string;
    reference: string;
    dealId: string;
    quoteId?: string;
    kind: string;
    acceptedByName: string;
  };
}

type Handler<K extends keyof DomainEvents> = (event: DomainEvents[K]) => Promise<void> | void;

const handlers: { [K in keyof DomainEvents]?: Handler<K>[] } = {};

export function on<K extends keyof DomainEvents>(name: K, handler: Handler<K>) {
  (handlers[name] ??= [] as never).push(handler as never);
}

export async function emit<K extends keyof DomainEvents>(name: K, event: DomainEvents[K]) {
  for (const handler of (handlers[name] ?? []) as Handler<K>[]) {
    try {
      await handler(event);
    } catch (error) {
      console.error(`Event handler for ${name} failed.`, error);
    }
  }
}
