import { NextRequest } from "next/server";
import { signIn } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const redirectTo = callbackUrl?.startsWith("/") ? callbackUrl : "/internal";
  await signIn("discord", { redirectTo });
}
