import Image from 'next/image'
import caftonMark from '@/assets/cafton.png'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 overflow-hidden rounded-2xl animate-pulse">
          <Image src={caftonMark} alt="CAFTON" className="h-full w-full object-cover" priority />
        </div>
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    </div>
  )
}
