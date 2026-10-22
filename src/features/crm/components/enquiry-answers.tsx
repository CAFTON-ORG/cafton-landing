import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Compass,
  Megaphone,
  StickyNote,
  Target,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/dashboard/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : text(value)
      ? text(value).split(/;\s*/).filter(Boolean)
      : [];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="text-muted-foreground size-4" aria-hidden="true" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  const shown = items.filter(([, value]) => value);
  if (shown.length === 0) return null;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="text-sm break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What the visitor told us on the contact form, grouped the way a salesperson reads it. */
export function EnquiryAnswers({
  answers,
  goalsArea,
}: {
  answers: Record<string, unknown>;
  /** The title of the service area they picked, when known. */
  goalsArea?: string;
}) {
  const challenges = [...list(answers.challenges), ...list(answers.challengesOther)];
  const project = [
    ["This project is for", text(answers.buildingFor)],
    ["Business", text(answers.businessName)],
    ["Industry", text(answers.industry)],
    ["Their role", text(answers.position)],
    ["Business size", text(answers.businessSize)],
    ["Years operating", text(answers.yearsOperating)],
    ["Office address", text(answers.officeAddress)],
  ] satisfies [string, string][];
  const goals = text(answers.goals);
  const budget = text(answers.budget);
  const timeline = text(answers.timeline);
  const referral = text(answers.referralSource);
  const notes = text(answers.notes);
  const area = goalsArea ?? text(answers.goalsCategory);

  const empty =
    project.every(([, v]) => !v) &&
    challenges.length === 0 &&
    !goals &&
    !area &&
    !budget &&
    !timeline &&
    !referral &&
    !notes;
  if (empty) {
    return (
      <p className="text-muted-foreground text-sm">
        They did not fill in any of the optional questions.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {(budget || timeline) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [Wallet, "Budget", budget],
            [Compass, "Timeline", timeline],
          ].map(([Icon, label, value]) => {
            const I = Icon as LucideIcon;
            return value ? (
              <div
                key={label as string}
                className="bg-card flex items-center gap-3 rounded-xl border p-4"
              >
                <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
                  <I className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-muted-foreground text-xs">{label as string}</p>
                  <p className="font-medium">{value as string}</p>
                </div>
              </div>
            ) : null;
          })}
        </div>
      )}

      {(area || goals) && (
        <Section icon={Target} title="What they want">
          {area && (
            <Badge variant="secondary" className="mb-2">
              {area}
            </Badge>
          )}
          {goals && <p className="text-sm">{goals}</p>}
        </Section>
      )}

      {challenges.length > 0 && (
        <Section icon={TriangleAlert} title="What is getting in their way">
          <ul className="flex flex-wrap gap-2">
            {challenges.map((challenge) => (
              <li key={challenge}>
                <Badge variant="outline" className="h-auto py-1 whitespace-normal">
                  {challenge}
                </Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {project.some(([, value]) => value) && (
        <Section icon={Briefcase} title="About them">
          <Facts items={project} />
        </Section>
      )}

      {referral && (
        <Section icon={Megaphone} title="How they found us">
          <p className="text-sm">{referral}</p>
        </Section>
      )}

      {notes && (
        <Section icon={StickyNote} title="Their notes">
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
        </Section>
      )}
    </div>
  );
}
