import type { BookingSettings } from "../types";

/** When people can book a call, as it was before it was editable. Times are Philippine time. */
export const booking: BookingSettings = {
  enabled: true,
  autoConfirm: false,
  slotMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 12,
  maxDaysAhead: 45,
  hours: [
    { open: false, start: "09:00", end: "17:00" },
    { open: true, start: "09:00", end: "17:00" },
    { open: true, start: "09:00", end: "17:00" },
    { open: true, start: "09:00", end: "17:00" },
    { open: true, start: "09:00", end: "17:00" },
    { open: true, start: "09:00", end: "17:00" },
    { open: false, start: "09:00", end: "17:00" },
  ],
  blockedDates: [],
  videoLink: "",
  phoneNumber: "",
  office: "Baguio City, Philippines",
  intro: "Pick a time that suits you and we will confirm it by email. Times are Philippine time (UTC+8).",
};
