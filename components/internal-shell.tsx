"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const PAGE_TITLES: Record<string, string> = {
  "/internal": "ダッシュボード",
  "/internal/members": "メンバー一覧",
  "/internal/events": "イベント一覧",
  "/internal/profile": "プロフィール",
  "/internal/profile/edit": "プロフィール編集",
  "/internal/settings": "設定",
}

interface InternalShellProps {
  children: React.ReactNode
  userName: string
  userImage?: string
  memberNickname?: string
  memberRole?: string
}

export function InternalShell({ children, userName, userImage, memberNickname, memberRole }: InternalShellProps) {
  const pathname = usePathname()
  const pageTitle = PAGE_TITLES[pathname] || ""
  const isSubPage = pathname.split("/").length > 3

  return (
    <SidebarProvider>
      <AppSidebar
        userName={userName}
        userImage={userImage}
        memberNickname={memberNickname}
        memberRole={memberRole}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {isSubPage && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/${pathname.split("/").slice(1, 3).join("/")}`}>
                        {PAGE_TITLES[`/${pathname.split("/").slice(1, 3).join("/")}`] || ""}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-medium">{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
