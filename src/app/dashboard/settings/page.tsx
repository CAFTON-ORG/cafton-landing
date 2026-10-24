import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Badge } from "@/components/dashboard/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { RESOURCES, type Resource } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const staff = await requirePageAccess("settings:view");
  if (!staff) return <AccessDenied area="settings" />;

  const resources = (Object.keys(RESOURCES) as Resource[]).filter((resource) =>
    staff.permissions.some((permission) => permission.startsWith(`${resource}:`)),
  );

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account. Appearance follows the toggle in the top bar."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>Name, email and photo come from your Google account.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{staff.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{staff.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role</dt>
                <dd>
                  <Badge variant="secondary">{staff.roleName}</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you can do</CardTitle>
            <CardDescription>
              {staff.permissions.length} permissions from your role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {resources.map((resource) => (
                <li key={resource} className="flex flex-wrap items-center gap-1.5">
                  <span className="min-w-36 font-medium">{RESOURCES[resource].label}</span>
                  {staff.permissions
                    .filter((permission) => permission.startsWith(`${resource}:`))
                    .map((permission) => (
                      <Badge key={permission} variant="outline">
                        {permission.split(":")[1]}
                      </Badge>
                    ))}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
