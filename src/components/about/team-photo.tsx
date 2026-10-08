import Image from "next/image";

export function TeamPhoto() {
  return (
    <div className="group relative h-full w-full overflow-hidden rounded-xl border bg-muted/40">
      <Image
        src="/cafton-team.jpg"
        alt="The Cafton team"
        fill
        sizes="(min-width: 1024px) 40vw, 100vw"
        priority
        className="object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0"
      />
    </div>
  );
}
