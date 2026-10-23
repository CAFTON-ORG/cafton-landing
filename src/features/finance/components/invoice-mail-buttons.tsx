"use client";

import { useRouter } from "next/navigation";
import { BellRing, Mail } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { remindNow, sendInvoice } from "../actions/invoices";

/** Emails the invoice to the client with the PDF attached. */
export function SendInvoiceButton({ id, sent }: { id: string; sent: boolean }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => sendInvoice({ id }), {
          success: "Invoice emailed.",
          onSuccess: () => router.refresh(),
        })
      }
    >
      <Mail aria-hidden="true" /> {pending ? "Sending…" : sent ? "Send again" : "Email to client"}
    </Button>
  );
}

/** Sends the overdue reminder now instead of waiting for the daily one. */
export function RemindButton({ id }: { id: string }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => remindNow(id), {
          success: "Reminder sent.",
          onSuccess: () => router.refresh(),
        })
      }
    >
      <BellRing aria-hidden="true" /> {pending ? "Sending…" : "Remind now"}
    </Button>
  );
}
