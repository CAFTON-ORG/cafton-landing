import { Logo } from "@/components/shared/logo";

/**
 * The Cafton mark at the center of the contact page's system graphic. It
 * sways in perspective with CSS alone: at this size (96px) a WebGL canvas
 * would cost a whole three.js download and a GPU context for no visible
 * gain.
 */
export function SystemHub() {
  return (
    <div className="flex h-full w-full items-center justify-center [perspective:500px]">
      <Logo
        className="animate-hub-sway h-2/3 w-auto text-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
