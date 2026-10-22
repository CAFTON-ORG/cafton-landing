"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUp, TriangleAlert } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
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
import { importCsv, type ImportReport } from "../actions/import";

const SAMPLE: Record<"contacts" | "organizations", string> = {
  contacts:
    "Name,Email,Phone,Position,Company,Tags\nAda Lovelace,ada@example.com,0917 000 0000,Founder,Acme,vip",
  organizations:
    "Name,Industry,Size,Website,Phone,Address,Tags\nAcme,Retail,11-50,https://acme.example,0917 000 0000,Baguio City,vip",
};

/** Import contacts or organizations from a spreadsheet: choose the file, check the preview, confirm. */
export function ImportDialog({ kind }: { kind: "contacts" | "organizations" }) {
  const router = useRouter();
  const allowed = useCan(kind === "contacts" ? "contacts:create" : "organizations:create");
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const input = useRef<HTMLInputElement>(null);

  if (!allowed) return null;

  const reset = () => {
    setCsv("");
    setFileName("");
    setReport(null);
    if (input.current) input.current.value = "";
  };

  async function choose(file: File | undefined) {
    if (!file) return;
    setReport(null);
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    run(() => importCsv({ kind, csv: text, dryRun: true }), {
      onSuccess: (data) => setReport(data ?? null),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <FileUp aria-hidden="true" /> Import CSV
      </DialogTrigger>
      <DialogContent scrollable className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import {kind}</DialogTitle>
          <DialogDescription>
            Choose a CSV file exported from a spreadsheet. You see what would happen before anything
            is saved.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="import-file" className="text-sm font-medium">
              CSV file
            </label>
            <Input
              id="import-file"
              ref={input}
              type="file"
              accept=".csv,text/csv"
              disabled={pending}
              onChange={(event) => void choose(event.target.files?.[0])}
            />
            <p className="text-muted-foreground text-xs">
              The first line is the column titles.{" "}
              {kind === "contacts"
                ? "Needed: Name (or First name) and Email. Duplicates are matched by email and skipped."
                : "Needed: Name. Organizations that already exist are skipped."}{" "}
              Up to 2,000 rows.
            </p>
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">
                Example of the format
              </summary>
              <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-2">{SAMPLE[kind]}</pre>
            </details>
          </div>

          {report && (
            <section aria-live="polite" className="grid gap-2 rounded-lg border p-3 text-sm">
              <h3 className="font-medium">{fileName}</h3>
              <ul className="grid gap-0.5">
                <li>
                  <strong>{report.created}</strong> will be added
                  {report.organizationsCreated > 0 &&
                    ` (and ${report.organizationsCreated} new organizations)`}
                </li>
                {report.existing > 0 && (
                  <li>
                    <strong>{report.existing}</strong> already exist and will be skipped
                  </li>
                )}
                {report.problems.length > 0 && (
                  <li className="text-amber-800 dark:text-amber-300">
                    <strong>{report.problems.length}</strong> rows can&apos;t be imported
                  </li>
                )}
              </ul>
              {report.problems.length > 0 && (
                <ul className="text-muted-foreground max-h-32 overflow-y-auto text-xs">
                  {report.problems.slice(0, 10).map((problem) => (
                    <li key={problem.line} className="flex gap-1.5">
                      <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      Line {problem.line}: {problem.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !report || report.created === 0}
            onClick={() =>
              run(() => importCsv({ kind, csv, dryRun: false }), {
                success: (data) => `Imported ${data?.created ?? 0} ${kind}.`,
                onSuccess: () => {
                  setOpen(false);
                  reset();
                  router.refresh();
                },
              })
            }
          >
            {pending ? "Working…" : report ? `Import ${report.created}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
