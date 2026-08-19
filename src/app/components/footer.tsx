import Link from 'next/link'
import { Logo } from '@/components/logo'
const footerLinks = [
  { href: '#hero', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-black/[.08] dark:border-white/[.1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 max-lg:justify-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-xl font-bold tracking-tight">Cafton</span>
            </Link>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Building solutions that move your business forward.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-black/[.08] px-6 py-6 dark:border-white/[.1]">
        <p className="mx-auto max-w-6xl text-xs text-zinc-500 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} Cafton. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
