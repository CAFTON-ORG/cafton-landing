import Image from "next/image";
import type { Partner } from "@/types/content";
import { cn } from "@/lib/utils";

/**
 * A partner's mark on a square plate. Every plate is the same size and radius
 * so very different logos (a white-on-black monogram, a white-on-green
 * wordmark, a transparent blue crest) read as one set; "cover" logos supply
 * their own square artwork, "contain" logos sit on a plate colour.
 */
export function LogoPlate({ partner, sizes }: { partner: Partner; sizes: string }) {
  const { logo } = partner;

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl border",
        logo.fit === "contain" && (logo.plate ?? "bg-muted"),
      )}
    >
      <Image
        src={logo.src}
        alt={`${partner.name} logo`}
        fill
        sizes={sizes}
        className={logo.fit === "cover" ? "object-cover" : "object-contain p-[12%]"}
      />
    </div>
  );
}
