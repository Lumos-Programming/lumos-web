"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
      onClick={() => signOut({ redirectTo: "/" })}
    >
      <LogOut className="h-4 w-4" />
      <span>ログアウト</span>
    </Button>
  );
}
