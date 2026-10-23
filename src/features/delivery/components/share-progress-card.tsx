"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Link2, RefreshCw, Unlink } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { shareProgress, stopSharingProgress } from "../actions/extras";

/**
 * The private page a client can follow their project on: status, milestones and how many tasks are
 * done, and nothing about money, hours or people. Only a link holder can open it. The link is shown
 * once, when it is made; renewing makes a new one and stops the old.
 */
export function ShareProgressCard({
  projectId,
  sharedAt,
  canEdit,
  cancelled,
}: {
  projectId: string;
  sharedAt?: string;
  canEdit: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  function make() {
    run(() => shareProgress(projectId), {
      success: sharedAt ? "New link made. The old one no longer works." : "Link made.",
      onSuccess: (data) => {
        setLink((data as { link: string } | undefined)?.link ?? "");
        setCopied(false);
        router.refresh();
      },
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client progress page</CardTitle>
        <CardDescription>
          {sharedAt
            ? `Shared since ${formatDate(sharedAt)}. Anyone with the link sees where the work stands.`
            : "Give the client a private page to follow the work. It shows status, milestones and task progress, never money, hours or people."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {link && (
          <div className="grid gap-1.5">
            <label htmlFor="progress-link" className="text-sm font-medium">
              Send this link to the client
            </label>
            <div className="flex gap-2">
              <Input
                id="progress-link"
                readOnly
                value={link}
                onFocus={(event) => event.target.select()}
              />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              This is the only time the link is shown. Make a new one if you lose it.
            </p>
          </div>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={sharedAt ? "outline" : "default"}
              disabled={pending || cancelled}
              onClick={make}
            >
              {sharedAt ? <RefreshCw aria-hidden="true" /> : <Link2 aria-hidden="true" />}
              {sharedAt ? "Make a new link" : "Share with the client"}
            </Button>
            {sharedAt && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() => stopSharingProgress(projectId), {
                    success: "Sharing stopped.",
                    onSuccess: () => {
                      setLink("");
                      router.refresh();
                    },
                  })
                }
              >
                <Unlink aria-hidden="true" /> Stop sharing
              </Button>
            )}
          </div>
        )}
        {cancelled && (
          <p className="text-muted-foreground text-xs">A cancelled project can&apos;t be shared.</p>
        )}
      </CardContent>
    </Card>
  );
}
