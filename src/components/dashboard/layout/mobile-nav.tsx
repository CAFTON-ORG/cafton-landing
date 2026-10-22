"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Brand } from "@/components/dashboard/shared/brand";
import { Button } from "@/components/dashboard/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/dashboard/ui/sheet";
import { NavLinks } from "./nav-links";
import { SidebarUserMenu } from "./sidebar-user-menu";

/** The navigation drawer for phones and tablets (below `md`). Closes on navigation. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open navigation" className="md:hidden" />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col gap-6 p-4">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="px-2">
            <Brand />
          </Link>
          <div className="flex-1 overflow-y-auto">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-sidebar-border border-t pt-4">
            <SidebarUserMenu />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
