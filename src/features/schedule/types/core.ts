export const MEETING_STATUSES = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_MODES = ["video", "phone", "in_person"] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const MEETING_MODE_LABEL: Record<MeetingMode, string> = {
  video: "Video call",
  phone: "Phone call",
  in_person: "In person",
};

/** A reference to the record a meeting is about. */
export interface MeetingLink {
  id: string;
  /** "LD-2026-0001", or the contact's name. */
  label: string;
}

export interface MeetingView {
  id: string;
  title: string;
  /** ISO timestamps (UTC). Show them with `formatManila`. */
  startsAt: string;
  endsAt: string;
  mode: MeetingMode;
  location?: string;
  status: MeetingStatus;
  source: "website" | "staff";
  notes?: string;
  cancelledReason?: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  lead?: MeetingLink;
  contact?: MeetingLink;
  deal?: MeetingLink;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
}
