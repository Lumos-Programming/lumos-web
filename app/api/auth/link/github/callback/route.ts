import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  exchangeCodeForToken,
  fetchProviderUser,
  getCallbackUrl,
} from "@/lib/oauth-link";
import { updateMemberSns } from "@/lib/members";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_link_state_github")?.value;
  const redirectTo =
    cookieStore.get("oauth_link_redirect")?.value ?? "/internal/settings";

  cookieStore.delete("oauth_link_state_github");
  cookieStore.delete("oauth_link_redirect");

  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;

  if (!code || !state || state !== savedState) {
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "github_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }

  const session = await auth();
  if (!session?.user?.id || session.user.optedOut) {
    return NextResponse.redirect(
      new URL("/internal/settings?error=github_link_failed", origin),
    );
  }
  // 更新対象は認証済みセッションのみを根拠に決定する。
  const discordId = session.user.id;

  try {
    const token = await exchangeCodeForToken(
      "github",
      code,
      getCallbackUrl("github", origin),
    );
    const user = await fetchProviderUser("github", token);

    await updateMemberSns(discordId, {
      github: user.username,
      githubId: user.id,
      githubAvatar: user.avatar,
    });

    const successUrl = new URL(redirectTo, origin);
    successUrl.searchParams.set("success", "github_linked");
    return NextResponse.redirect(successUrl.toString());
  } catch (e) {
    console.error("GitHub link callback error:", e);
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "github_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}
