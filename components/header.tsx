import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard } from "lucide-react";
import HeaderClient from "@/components/header-client";
import { LogoutButton } from "@/components/logout-button";
import { LoginButton } from "@/components/login-button";

export default async function Header() {
  const session = await auth();

  let authContent;
  if (session) {
    const avatarUrl = session.user?.faceImage || session.user?.image;

    authContent = (
      <div className="flex items-center gap-2">
        <Link href="/internal">
          <Button variant="outline" size="sm" className="gap-2">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
              />
            )}
            <span>ポータルへ</span>
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </Link>
        <div className="md:hidden">
          <LogoutButton />
        </div>
      </div>
    );
  } else {
    authContent = <LoginButton />;
  }

  return <HeaderClient>{authContent}</HeaderClient>;
}
