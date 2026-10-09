import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { LogoPlate } from "@/components/partners/logo-plate";
import type { Partner } from "@/types/content";

function RoleTags({ roles }: { roles: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <li
          key={role}
          className="rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {role}
        </li>
      ))}
    </ul>
  );
}

export function PartnerEntry({ partner }: { partner: Partner }) {
  return (
    <>
      <div className="mx-auto w-full max-w-60 transition-transform duration-300 ease-out group-hover:-translate-y-1 sm:max-w-none">
        <LogoPlate partner={partner} sizes="(min-width: 640px) 30vw, 240px" />
      </div>

      <div className="mx-auto mt-5 max-w-60 sm:max-w-none">
        {partner.roles && <RoleTags roles={partner.roles} />}
        <h3 className="mt-3 text-balance text-xl font-bold leading-tight tracking-tight">
          {partner.name}
        </h3>
        {partner.description && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {partner.description}
          </p>
        )}
        {partner.links && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {partner.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group/link inline-flex items-center text-sm font-medium"
                >
                  {link.label}
                  <ArrowUpRight className="ms-1 size-4 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function PartnerWall({ items }: { items: Partner[] }) {
  return (
    <RevealGroup className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((partner) => (
        <RevealItem key={partner.name} className="group">
          <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
            <LogoPlate partner={partner} sizes="(min-width: 1024px) 14vw, (min-width: 640px) 28vw, 44vw" />
          </div>
          <p className="mt-3 text-sm font-semibold leading-tight">{partner.shortName}</p>
          {partner.roles && (
            <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
              {partner.roles[0]}
            </p>
          )}
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
