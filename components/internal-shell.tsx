"use client"

import Link from "next/link"
import Image from "next/image"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { VersionInfo } from "@/components/version-info"

interface InternalShellProps {
  children: React.ReactNode
  userName: string
  userImage?: string
  memberNickname?: string
  memberRole?: string
}

export function InternalShell({ children, userName, userImage, memberNickname, memberRole }: InternalShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        userName={userName}
        userImage={userImage}
        memberNickname={memberNickname}
        memberRole={memberRole}
      />
      <SidebarInset>
        <header className="relative flex h-16 shrink-0 items-center border-b px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Link href="/internal" className="internal-logo-link absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Image
              src="/assets/Lumoslogo.png"
              alt="Lumos"
              width={64}
              height={40}
              className="shrink-0"
            />
            <span className="text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
              メンバー専用ポータル
            </span>
          </Link>
        </header>
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t py-4 px-4 mt-auto">
            <p className="text-xs text-muted-foreground/60 text-center">
              &copy; {new Date().getFullYear()} Lumos — 横浜国立大学プログラミングサークル
            </p>
            <div className="mt-1">
              <VersionInfo />
            </div>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
