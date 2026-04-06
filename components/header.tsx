"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "ホーム", href: "/" },
  { name: "サークル紹介", href: "/about" },
  // { name: "メンバー", href: "/members" },
  { name: "プロジェクト紹介", href: "/projects" },
  { name: "お知らせ", href: "/news" },
  // { name: "お問い合わせ", href: "/contact" },
];

export default function Header({ authSlot }: { authSlot?: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // メニュー開閉時のボディスクロール制御
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={cn(
        "fixed w-full z-40 transition-all duration-300",
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
          {authSlot}
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-white md:hidden overflow-y-auto">
          <div className="flex justify-end p-4 md:hidden">
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">メニューを閉じる</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-6 px-6 py-6">
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
          {authSlot && <div className="px-6 pb-6">{authSlot}</div>}
        </div>
      )}
    </header>
  );
}
