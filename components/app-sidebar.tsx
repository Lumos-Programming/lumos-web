"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, CalendarDays, UserCircle, Settings, ExternalLink } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const NAV_ITEMS = [
  { href: "/internal", icon: LayoutDashboard, label: "ホーム", exact: true },
  { href: "/internal/members", icon: Users, label: "メンバー" },
  { href: "/internal/events", icon: CalendarDays, label: "イベント" },
  { href: "/internal/profile", icon: UserCircle, label: "プロフィール" },
  { href: "/internal/settings", icon: Settings, label: "設定" },
]

interface AppSidebarProps {
  userName: string
  userImage?: string
  memberNickname?: string
  memberRole?: string
}

export function AppSidebar({ userName, userImage, memberNickname, memberRole }: AppSidebarProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-sidebar-primary/20">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {(memberNickname || userName).charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{memberNickname || userName}</span>
            {memberRole && (
              <span className="text-[11px] text-sidebar-foreground/50 truncate">{memberRole}</span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="サイトに戻る">
              <Link href="/" onClick={() => setOpenMobile(false)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
                <ExternalLink />
                <span>サイトに戻る</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
