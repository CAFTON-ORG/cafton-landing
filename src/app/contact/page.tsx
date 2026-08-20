import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Contact
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Have a problem worth solving?
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Tell us what you&apos;re building, what isn&apos;t working, or what
            you&apos;d like to improve.
          </p>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl">
          <form className="grid gap-6 rounded-xl border bg-card p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  name="organization"
                  autoComplete="organization"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectType">Project type</Label>
              <select
                id="projectType"
                name="projectType"
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option>Custom Software</option>
                <option>Web Application</option>
                <option>Mobile Application</option>
                <option>SaaS / Product</option>
                <option>System Modernization</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project">Tell us about your project</Label>
              <Textarea id="project" name="project" rows={6} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="budget">
                  Budget range{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="budget" name="budget" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timeline">
                  Timeline{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="timeline" name="timeline" />
              </div>
            </div>
            <Button type="button" disabled>
              Send Inquiry{" "}
              <span className="ml-2 text-xs opacity-70">Coming soon</span>
            </Button>
          </form>
        </PageShell>
      </PageSection>
    </>
  );
}
