import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { headers } from "next/headers";

export default async function HeaderAuth() {
  const session = await auth();

  if (session) {
    return (
      <Link href="/internal">
        <Button variant="outline" size="sm">
          {session.user?.name ?? "マイページ"}
        </Button>
      </Link>
    );
  }

  const headersList = await headers();
  const referer = headersList.get("referer") ?? "";
  // Extract pathname from referer, fall back to /internal
  let redirectTo = "/internal";
  try {
    const url = new URL(referer);
    if (url.pathname && url.pathname !== "/") {
      redirectTo = url.pathname;
    }
  } catch {
    // ignore invalid referer
  }

  return (
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
