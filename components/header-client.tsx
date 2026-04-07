"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "ホーム", href: "/" },
  { name: "サークル紹介", href: "/about" },
  { name: "メンバー", href: "/members" },
  { name: "プロジェクト紹介", href: "/projects" },
  { name: "お知らせ", href: "/news" },
];

export default function HeaderClient({ children }: { children?: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed w-full z-50 transition-all duration-300",
          scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white",
        )}
      >
        <nav className="container mx-auto px-4 md:px-6 flex items-center justify-between py-4">
          <div className="flex items-center">
            <Image
              src="/assets/Lumoslogo.png"
              alt={"Lumoslogo"}
              width={50}
              height={50}
            />
            <Link href="/" className="text-2xl font-bold text-primary">
              Lumos
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:gap-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-foreground hover:text-accent-foreground transition-colors"
              >
                {item.name}
              </Link>
            ))}
            {children}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">メニューを開く</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu - portaled to body to avoid header clipping */}
      {mobileMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
            <div className="flex h-16 items-center justify-between px-4">
              <Link href="/" className="text-2xl font-bold text-primary">
                Lumos
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">メニューを閉じる</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root px-6">
              <div className="space-y-6 py-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-base font-medium text-foreground hover:text-accent-foreground transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              {children && <div className="mt-8">{children}</div>}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
