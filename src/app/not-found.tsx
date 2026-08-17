import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import caftonMark from "@/assets/cafton.png"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-6 h-16 w-16 overflow-hidden rounded-2xl border shadow-lg">
          <Image src={caftonMark} alt="CAFTON" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">Page not found</p>
        <Button asChild className="mt-4">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
