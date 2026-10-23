"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Download, FileText } from "lucide-react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import type { Preset } from "../report-presets";

/** The dates a report is for, ready-made choices, and the file downloads. */
export function ReportControls({
  reportKey,
  dated,
  from,
  to,
  asOf,
  presets,
}: {
  reportKey: string;
  dated: "period" | "asOf";
  from: string;
  to: string;
  asOf: string;
  presets: Preset[];
}) {
  const router = useRouter();
  const path = usePathname();
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [day, setDay] = useState(asOf);

  const query = new URLSearchParams(dated === "period" ? { from, to } : { asOf }).toString();
  const href = (format: "csv" | "pdf") =>
    `/api/finance/reports/${reportKey}?${query}&format=${format}`;

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {dated === "period" ? (
            <>
              <Field id="report-from" label="From">
                <DatePicker id="report-from" value={start} onChange={setStart} />
              </Field>
              <Field id="report-to" label="To">
                <DatePicker id="report-to" value={end} onChange={setEnd} />
              </Field>
            </>
          ) : (
            <Field id="report-as-of" label="As of">
              <DatePicker id="report-as-of" value={day} onChange={setDay} />
            </Field>
          )}
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `${path}?${new URLSearchParams(dated === "period" ? { from: start, to: end } : { asOf: day })}`,
              )
            }
          >
            Show
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<a href={href("csv")} download />}>
            <Download aria-hidden="true" /> CSV
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href={href("pdf")} download />}>
            <FileText aria-hidden="true" /> PDF
          </Button>
        </div>
        <nav aria-label="Quick dates" className="flex w-full flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href={`${path}?${new URLSearchParams(preset.params)}`} />}
            >
              {preset.label}
            </Button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
