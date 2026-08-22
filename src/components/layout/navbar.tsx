"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Logo } from "@/components/shared/logo";

const navigationItems = [
  { name: "Home", href: "/" },

  { name: "About", href: "/about" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Partnerships", href: "/partnerships" },
  { name: "Blog", href: "/blog" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer"
            rel="noopener noreferrer"
          >
            <Logo size={32} />
            <span className="font-bold uppercase">Cafton</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center xl:flex"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`inline-flex h-10 items-center justify-center border-b-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                pathname === item.href
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden xl:flex items-center space-x-2">
          <ModeToggle variant="ghost" />
          <Button asChild className="cursor-pointer">
            <Link href="/contact">
              Contact Us
              <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:w-[400px] p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="space-y-0 p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Logo size={16} />
                  </div>
                  <SheetTitle className="sr-only">CAFTON</SheetTitle>
                  <div className="ml-auto flex items-center gap-2">
                    <ModeToggle variant="ghost" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <nav className="p-6 space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Footer Actions */}
              <div className="border-t p-6">
                <Button size="lg" asChild className="w-full cursor-pointer">
                  <Link href="/contact" onClick={() => setIsOpen(false)}>
                    Contact Us
                    <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
