# 0009 - Scheduling and meetings

## Decision

Meetings are first-class records (`meetings`), not timeline notes. A visitor can ask for a time on the contact form; staff can also schedule directly.

- **Availability** lives in the `booking` site document (hours per weekday, slot length, buffer, minimum notice, how far ahead, blocked dates), edited at CRM > Schedule > Booking settings.
- **Time zone** is fixed to Manila (UTC+8, no daylight saving) in `features/schedule/slots.ts`. Everything is stored as UTC instants.
- **No double booking** is enforced by the database: an exclusion constraint (`meetings_no_overlap`) on the time range for `requested` and `confirmed` meetings. The app checks first for friendly messages; the constraint is the guarantee when two people book at once.
- **Requests vs confirmed**: website bookings are `requested` (they hold the slot) unless auto-confirm is on; staff meetings are confirmed immediately. Cancelling frees the time.
- **Email**: confirmation or request-received to the visitor with an ICS file, a notice to staff who can update meetings, and cancellation with an iCal CANCEL.
- **Roles** are edited on a page (`/dashboard/roles/[id]`), like other admin tools, because a permission matrix is too large for a dialog. Dialogs that can grow use the scrollable pattern (sticky header and footer, body scrolls).

- **Reminders**: a daily job (`/api/cron/reminders`, 09:00 Philippine time) emails confirmed meetings starting within 36 hours. `reminder_logs` has a unique key per meeting and start time, so a reminder is sent once and a moved meeting is reminded again. The route needs `CRON_SECRET` and refuses to run without it.
- **Calendar link**: each staff member can make a private subscription link (`/api/calendar/<token>.ics`, token stored on their profile, resettable). It lists the meetings they host and those nobody hosts yet.
- **Layout**: the schedule is a Month or Week calendar with the chosen day beside it, as in Google Calendar; the view and day are in the address.

## Not done

Two-way calendar sync (Google/Outlook) and per-person availability; hours are for the whole team.
