import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  className?: string;
  /** What became of the time the visitor picked, if they picked one. */
  meeting?: { outcome?: string; start?: string };
  onReset: () => void;
}

export function SuccessScreen({ className = "", meeting, onReset }: SuccessScreenProps) {
  const when = meeting?.start
    ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" }).format(new Date(meeting.start))
    : "";
  return (
    <div
      role="status"
      className={`flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center ${className}`}
    >
      <CheckCircle2 className="size-10 text-primary" />
      <h2 className="text-2xl font-semibold">Message sent</h2>
      <p className="max-w-md text-muted-foreground">
        Thanks for reaching out. We usually reply within 1 business day.
      </p>
      {meeting?.outcome === "confirmed" && (
        <p className="max-w-md font-medium">Your call is booked for {when} (Philippine time). Check your email for the details.</p>
      )}
      {meeting?.outcome === "requested" && (
        <p className="max-w-md font-medium">We will confirm your call for {when} (Philippine time) by email.</p>
      )}
      {meeting?.outcome === "unavailable" && (
        <p className="max-w-md font-medium">That time was just taken or is no longer open, so we haven&apos;t booked it. We will email you to arrange another time.</p>
      )}
      {/*
        Scheduling plan (not integrated yet -- no CRM/booking tool is wired
        up on this project): once one is chosen, this is where a "pick a
        time" step would go. The footer already links out to a working
        Calendly (https://calendly.com/cafton-company/consultation) for
        "Book a call" -- that's the natural thing to reuse here rather than
        adding a second, different scheduling tool.
      */}
      <Button variant="outline" className="mt-2 cursor-pointer" onClick={onReset}>
        Send another message
      </Button>
    </div>
  );
}
