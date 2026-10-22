"use client";

import { CalendarPlus, CalendarX2 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/shared/empty-state";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import type { PersonRef } from "@/features/crm/types";
import type { MeetingView } from "../types";
import { MeetingCard } from "./meeting-card";
import { MeetingDialog, type MeetingDefaults } from "./meeting-dialog";

/** The meetings about one lead, deal or contact, with a button to schedule another. */
export function MeetingsPanel({
  meetings,
  people,
  defaults,
}: {
  meetings: MeetingView[];
  people: PersonRef[];
  defaults: MeetingDefaults;
}) {
  const canCreate = useCan("meetings:create");
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Meetings</CardTitle>
        {canCreate && (
          <MeetingDialog
            people={people}
            defaults={defaults}
            trigger={<Button size="sm" variant="outline" />}
          >
            <CalendarPlus aria-hidden="true" /> Schedule
          </MeetingDialog>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {meetings.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarX2}
            title="No meetings yet"
            description="Schedule a call and it shows up here and on the calendar."
          />
        ) : (
          meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} people={people} compact />
          ))
        )}
      </CardContent>
    </Card>
  );
}
