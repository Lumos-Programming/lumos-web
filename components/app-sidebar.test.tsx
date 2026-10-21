import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

const mocks = vi.hoisted(() => ({
  setOpenMobile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/admin/events",
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/env", () => ({ isProduction: () => true }));
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: "aside",
  SidebarContent: "div",
  SidebarFooter: "footer",
  SidebarGroup: "section",
  SidebarGroupContent: "div",
  SidebarGroupLabel: "h2",
  SidebarHeader: "header",
  SidebarMenu: "ul",
  SidebarMenuButton: "div",
  SidebarMenuItem: "li",
  SidebarRail: "div",
  useSidebar: () => ({ setOpenMobile: mocks.setOpenMobile }),
}));
vi.mock("@/components/ui/avatar", () => ({
  Avatar: "div",
  AvatarFallback: "span",
  AvatarImage: "img",
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: "div",
  DropdownMenuContent: "div",
  DropdownMenuItem: "div",
  DropdownMenuTrigger: "div",
}));

function findElementByHref(
  node: ReactNode,
  href: string,
): ReactElement<{ href: string; children?: ReactNode }> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ href?: string; children?: ReactNode }>(child)) {
      continue;
    }
    if (child.props.href === href) {
      return child as ReactElement<{ href: string; children?: ReactNode }>;
    }
    const found = findElementByHref(child.props.children, href);
    if (found) return found;
  }
}

function textContent(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      return isValidElement<{ children?: ReactNode }>(child)
        ? textContent(child.props.children)
        : "";
    })
    .join("");
}

it("管理者がサイドバーからイベント管理画面を開ける", () => {
  const sidebar = AppSidebar({ userName: "Member", isAdmin: true });
  const eventManagementLink = findElementByHref(
    sidebar,
    "/internal/admin/events",
  );

  expect(eventManagementLink).toBeDefined();
  expect(textContent(eventManagementLink?.props.children)).toContain(
    "イベント管理",
  );
});
