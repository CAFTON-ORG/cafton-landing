import { History, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { listRecentAudit } from "@/features/audit/repository";
import { listRoles } from "@/features/roles/repository";
import { listAllUsers } from "@/features/users/repository";
import { can, verifySession } from "@/lib/auth/dal";
import { isDatabaseConfigured } from "@/lib/env";
import { formatRelative } from "@/lib/format";

export default async function OverviewPage() {
  const staff = await verifySession();
  const showPeople = can(staff, "users:view");
  const showRoles = can(staff, "roles:view");
  const showAudit = can(staff, "audit:view");

  const [users, roles, recent] = await Promise.all([
    showPeople ? listAllUsers() : [],
    showRoles ? listRoles() : [],
    showAudit ? listRecentAudit(6) : [],
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${staff.name.split(" ")[0]}`}
        description={`Signed in as ${staff.roleName}.`}
      />

      {!isDatabaseConfigured && (
        <p
          role="status"
          className="bg-muted text-muted-foreground mb-6 rounded-lg px-4 py-3 text-sm"
        >
          The database isn&rsquo;t connected, so lists are empty. Add <code>DATABASE_URL</code> to{" "}
          <code>.env.local</code> (or run <code>npm run db:local</code>) to see real data.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {showPeople && (
          <StatCard
            label="People with access"
            value={String(users.filter((user) => user.status === "Active").length)}
            hint={`${users.filter((user) => user.status === "Invited").length} invited`}
            icon={Users}
          />
        )}
        {showRoles && <StatCard label="Roles" value={String(roles.length)} icon={ShieldCheck} />}
        {showAudit && (
          <StatCard
            label="Recent changes"
            value={String(recent.length)}
            hint="Latest activity below"
            icon={History}
          />
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {showAudit && (
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                <Link href="/dashboard/audit" className="underline underline-offset-4">
                  See the full audit log
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nothing yet. Changes will show up here.
                </p>
              ) : (
                <ul className="divide-y">
                  {recent.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-4 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{entry.actor}</span> · {entry.summary}
                      </span>
                      <time dateTime={entry.at} className="text-muted-foreground shrink-0">
                        {formatRelative(entry.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What&rsquo;s coming</CardTitle>
            <CardDescription>
              The platform is built in phases. Each one adds a section to the menu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground grid gap-1.5 text-sm">
              <li>Content management for the website</li>
              <li>CRM: leads, contacts, deals and pipeline</li>
              <li>Sales: quotes and contracts</li>
              <li>Delivery: projects and time</li>
              <li>Finance and accounting</li>
              <li>HR and payroll</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
