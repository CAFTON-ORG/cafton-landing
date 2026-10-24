/** An iCalendar (.ics) invitation, so "Add to calendar" works in Google, Outlook and Apple Calendar. */

export const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 bytes continue on the next line, starting with a space. */
export function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildIcs(event: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  /** CANCEL removes the event from the attendee's calendar. */
  method?: "REQUEST" | "CANCEL";
  sequence?: number;
}): string {
  const cancel = event.method === "CANCEL";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cafton//Schedule//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.method ?? "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}@cafton.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `ORGANIZER;CN=Cafton:mailto:${event.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(event.attendeeName)};RSVP=FALSE:mailto:${event.attendeeEmail}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export const icsAttachment = (ics: string, filename = "meeting.ics") => ({
  filename,
  content: Buffer.from(ics, "utf8").toString("base64"),
});
