import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Brand } from "@/components/dashboard/shared/brand";
import { Button } from "@/components/dashboard/ui/button";
import { LoginForm } from "@/features/auth/components/login-form";
import { getStaff } from "@/lib/auth/dal";
import { isDatabaseConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/env.public";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  auth: "Sign-in failed. Make sure your Google account has been invited.",
  access:
    "This Google account isn't set up for the dashboard. Ask an owner to invite it, or sign out and use another account.",
};

function safeNext(value?: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  if (isSupabaseConfigured && isDatabaseConfigured && !error) {
    if (await getStaff()) redirect(safeNext(next));
  }

  return (
    <main id="main" tabIndex={-1} className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="group text-muted-foreground hover:text-foreground mb-10 inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft
            className="size-4 transition-transform group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Back to website
        </Link>
        <Brand className="mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground mt-2 mb-8">
          Use your Google account to open the Cafton dashboard.
        </p>
        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mb-4 rounded-lg px-3 py-2 text-sm"
          >
            {ERRORS[error] ?? "Something went wrong."}
          </p>
        )}
        {error === "access" && (
          <form action="/auth/signout" method="post" className="mb-4">
            <Button type="submit" variant="outline" size="lg" className="w-full">
              Sign out
            </Button>
          </form>
        )}
        <LoginForm next={safeNext(next)} />
      </div>
    </main>
  );
}
