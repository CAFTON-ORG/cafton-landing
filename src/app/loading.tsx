import { Logo } from '@/components/logo'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border animate-pulse">
          <Logo size={28} />
        </div>
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    </div>
  )
}
