"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/components/consent/consent-provider";

interface CategoryProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Category({ id, title, description, checked, disabled, onCheckedChange }: CategoryProps) {
  return (
    <div className="flex items-start justify-between gap-6 border-t py-5">
      <div>
        <label htmlFor={id} className="text-sm font-semibold">
          {title}
        </label>
        <p id={`${id}-description`} className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-describedby={`${id}-description`}
        className="relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full border border-foreground/20 bg-muted transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-[state=checked]:bg-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-[1.375rem] data-[state=unchecked]:bg-foreground/70" />
      </Switch.Root>
    </div>
  );
}

/** Mounted only while the dialog is open, so it starts from the saved choice every time. */
function PreferencesForm() {
  const { closePreferences, consent, save, acceptAll, rejectAll } = useConsent();
  const [embeds, setEmbeds] = useState(consent?.embeds ?? false);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Dialog.Title className="text-xl font-bold">Cookie preferences</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose what this site may store. You can change this at any time
            from &ldquo;Cookie settings&rdquo; in the footer.
          </Dialog.Description>
        </div>
        <Dialog.Close className="-mr-2 -mt-1 flex size-11 shrink-0 sm:size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </div>

      <div className="mt-5">
        <Category
          id="consent-necessary"
          title="Strictly necessary"
          description="Remembers your cookie choice, keeps the contact form secure against spam and bots, and saves your light or dark preference when you set one. These can't be switched off."
          checked
          disabled
        />
        <Category
          id="consent-embeds"
          title="Embedded content"
          description="Loads content from other companies, such as the Gleam giveaway form on our events pages. Those companies set their own cookies under their own policies."
          checked={embeds}
          onCheckedChange={setEmbeds}
        />
        <div className="border-t" />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        We don&apos;t use analytics or advertising cookies. Details are in our{" "}
        <Link
          href="/privacy#cookies"
          onClick={closePreferences}
          className="font-medium text-foreground underline underline-offset-4"
        >
          privacy policy
        </Link>
        .
      </p>
      <div className="h-5" />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex sm:px-6 sm:pb-6">
        <Button
          className="col-span-2 cursor-pointer sm:order-last sm:flex-1"
          onClick={() => save({ embeds })}
        >
          Save choices
        </Button>
        <Button variant="outline" className="cursor-pointer sm:flex-1" onClick={rejectAll}>
          Reject non-essential
        </Button>
        <Button variant="outline" className="cursor-pointer sm:flex-1" onClick={acceptAll}>
          Accept all
        </Button>
      </div>
    </>
  );
}

/**
 * The full choices, as a standard modal dialog (focus trapped, Esc closes).
 * Strictly necessary storage is shown switched on and locked; every optional
 * category starts off and only changes when the visitor changes it.
 */
export function CookiePreferences() {
  const { preferencesOpen, closePreferences } = useConsent();

  return (
    <Dialog.Root
      open={preferencesOpen}
      onOpenChange={(open) => {
        if (!open) closePreferences();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-80 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-81 flex max-h-[min(90svh,44rem)] flex-col rounded-t-2xl border border-b-0 bg-background shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8 motion-reduce:animate-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-b sm:data-[state=closed]:zoom-out-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0">
          <PreferencesForm />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
