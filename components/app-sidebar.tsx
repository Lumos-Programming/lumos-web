"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCircle,
  Settings,
  ExternalLink,
  LogOut,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/internal", icon: LayoutDashboard, label: "ホーム", exact: true },
  { href: "/internal/members", icon: Users, label: "メンバー" },
  { href: "/internal/events", icon: CalendarDays, label: "イベント" },
  { href: "/internal/profile", icon: UserCircle, label: "プロフィール" },
  { href: "/internal/settings", icon: Settings, label: "設定" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/internal/admin", icon: Shield, label: "管理者ページ" },
];

interface AppSidebarProps {
  userName: string;
  userImage?: string;
  memberNickname?: string;
  memberRole?: string;
  isAdmin?: boolean;
}

export function AppSidebar({
  userName,
  userImage,
  memberNickname,
  memberRole,
  isAdmin,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-start">
          <Avatar className="h-9 w-9 shrink-0 border-2 border-sidebar-primary/20 transition-all duration-200 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {(memberNickname || userName).charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold truncate">
              {memberNickname || userName}
            </span>
            {memberRole && (
              <span className="text-[11px] text-sidebar-foreground/50 truncate">
                {memberRole}
              </span>
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
                  : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup
          className={isAdmin ? undefined : "opacity-40 pointer-events-none"}
        >
          <SidebarGroupLabel>管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = isAdmin && pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    {isAdmin ? (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton disabled tooltip={item.label}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="サイトに戻る">
              <Link
                href="/"
                onClick={() => setOpenMobile(false)}
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <ExternalLink />
                <span>サイトに戻る</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="ログアウト"
              onClick={() => signOut({ redirectTo: "/" })}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut />
              <span>ログアウト</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
