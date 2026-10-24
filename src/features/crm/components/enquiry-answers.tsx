import type { LucideIcon } from "lucide-react";
import { Briefcase, Megaphone, StickyNote, Target, TriangleAlert, Wallet } from "lucide-react";

import { Badge } from "@/components/dashboard/ui/badge";
import { Card, CardContent } from "@/components/dashboard/ui/card";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : text(value)
      ? text(value).split(/;\s*/).filter(Boolean)
      : [];

/** A titled block inside the one enquiry card (sections are divided by a line, not boxed). */
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
    <section className="grid gap-2 py-4 first:pt-0 last:pb-0">
      <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <Icon className="size-3.5" aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
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
    <Card>
      <CardContent className="divide-y">
        {(budget || timeline) && (
          <Section icon={Wallet} title="Budget and timing">
            <Facts
              items={[
                ["Budget", budget],
                ["Timeline", timeline],
              ]}
            />
          </Section>
        )}

        {(area || goals) && (
          <Section icon={Target} title="What they want">
            {area && (
              <div>
                <Badge variant="secondary">{area}</Badge>
              </div>
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
      </CardContent>
    </Card>
  );
}
