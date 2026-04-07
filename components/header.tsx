import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { LogIn } from "lucide-react";
import HeaderClient from "@/components/header-client";

export default async function Header() {
  const session = await auth();

  let authContent;
  if (session) {
    const avatarUrl = session.user?.faceImage || session.user?.image;

    authContent = (
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
          <span>{session.user?.name ?? "メンバー"}</span>
          <LogIn className="h-4 w-4" />
        </Button>
      </Link>
    );
  } else {
    const headersList = await headers();
    const referer = headersList.get("referer") ?? "";
    let redirectTo = "/internal";
    try {
      const url = new URL(referer);
      if (url.pathname && url.pathname !== "/") {
        redirectTo = url.pathname;
      }
    } catch {
      // ignore invalid referer
    }

    authContent = (
      <form
        action={async () => {
          "use server";
          await signIn("discord", { redirectTo });
        }}
      >
        <Button
          type="submit"
          size="sm"
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
        >
          Discordでログイン
        </Button>
      </form>
    );
  }

  return <HeaderClient>{authContent}</HeaderClient>;
}
