import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  className?: string;
  onReset: () => void;
}

export function SuccessScreen({ className = "", onReset }: SuccessScreenProps) {
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
