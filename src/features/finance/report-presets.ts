import { addDays } from "@/features/schedule/slots";

/** Ready-made date choices for a report, worked out from today. Pure. */
export interface Preset {
  label: string;
  /** Query string values for the report page. */
  params: Record<string, string>;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function periodPresets(today: string): Preset[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return [
    { label: "This month", params: { from: `${year}-${pad(month)}-01`, to: today } },
    { label: "This quarter", params: { from: `${year}-${pad(quarterMonth)}-01`, to: today } },
    { label: "This year", params: { from: `${year}-01-01`, to: today } },
    { label: "Last year", params: { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` } },
  ];
}

export function asOfPresets(today: string): Preset[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return [
    { label: "Today", params: { asOf: today } },
    { label: "End of last month", params: { asOf: addDays(`${year}-${pad(month)}-01`, -1) } },
    { label: "End of last year", params: { asOf: `${year - 1}-12-31` } },
  ];
}
