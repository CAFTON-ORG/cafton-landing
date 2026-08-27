import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-6 h-16 w-16 overflow-hidden rounded-2xl border shadow-lg">
          <Image
            src="/cafton.png"
            alt="CAFTON"
            className="h-full w-full object-cover"
            width={64}
            height={64}
          />
        </div>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">Page not found</p>
        <Button asChild className="mt-4 cursor-pointer">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
