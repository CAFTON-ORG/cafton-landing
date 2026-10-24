"use client";

import { useState } from "react";
import { CalendarSync, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { getCalendarLink, resetCalendarLink } from "../actions/feed";

/** "Add to my calendar": a private link Google, Outlook or Apple Calendar can subscribe to. */
export function CalendarFeed() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const { run, pending } = useServerAction();

  const load = (action: typeof getCalendarLink, success?: string) =>
    run(action, { success, onSuccess: (data) => data && setLink(data.link) });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !link) load(getCalendarLink);
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <CalendarSync aria-hidden="true" /> Add to my calendar
      </DialogTrigger>
      <DialogContent scrollable>
        <DialogHeader>
          <DialogTitle>Add the schedule to your calendar</DialogTitle>
          <DialogDescription>
            Subscribe to this private link and your meetings appear in Google Calendar, Outlook or
            Apple Calendar, and stay up to date.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <label htmlFor="calendar-link" className="text-sm font-medium">
            Your private link
          </label>
          <div className="flex gap-2">
            <Input id="calendar-link" readOnly value={link} placeholder="Making your link…" />
            <Button
              type="button"
              variant="outline"
              disabled={!link}
              onClick={() => {
                void navigator.clipboard.writeText(link).then(() => toast.success("Link copied."));
              }}
            >
              <Copy aria-hidden="true" /> Copy
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            In Google Calendar choose Other calendars, From URL, and paste it. Anyone with this link
            can see your meetings, so don&apos;t share it. If it leaks, reset it.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !link}
            onClick={() => load(resetCalendarLink, "New link made. The old one no longer works.")}
          >
            Reset link
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
