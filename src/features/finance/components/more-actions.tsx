"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";

export type MoreItem =
  | { kind: "link"; label: string; href: string; icon?: LucideIcon; download?: boolean }
  | {
      kind: "action";
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      destructive?: boolean;
    }
  | { kind: "separator" };

/**
 * The "More" menu on a document: the things that are not the main next step (download, credit
 * note, void). The main step stays a visible button, the way accounting packages lay it out. A dialog
 * opened from an item must live outside the menu, so the item only reports that it was chosen.
 */
export function MoreActions({ items }: { items: MoreItem[] }) {
  const real = items.filter((item) => item.kind !== "separator");
  if (real.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            More <ChevronDown aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        {items.map((item, index) => {
          if (item.kind === "separator") return <DropdownMenuSeparator key={index} />;
          const Icon = item.icon;
          if (item.kind === "link")
            return (
              <DropdownMenuItem
                key={item.label}
                render={
                  <a href={item.href} download={item.download} className="flex items-center gap-2">
                    {Icon && <Icon aria-hidden="true" />} {item.label}
                  </a>
                }
              />
            );
          return (
            <DropdownMenuItem
              key={item.label}
              variant={item.destructive ? "destructive" : "default"}
              onClick={item.onSelect}
            >
              {Icon && <Icon aria-hidden="true" />} {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
