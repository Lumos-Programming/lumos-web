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
  const savedState = cookieStore.get("oauth_link_state_x")?.value;
  const codeVerifier = cookieStore.get("oauth_link_verifier_x")?.value;
  const redirectTo =
    cookieStore.get("oauth_link_redirect")?.value ?? "/internal/settings";

  cookieStore.delete("oauth_link_state_x");
  cookieStore.delete("oauth_link_verifier_x");
  cookieStore.delete("oauth_link_redirect");

  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;

  if (!code || !state || state !== savedState || !codeVerifier) {
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "x_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }

  const session = await auth();
  if (!session?.user?.id || session.user.optedOut) {
    return NextResponse.redirect(
      new URL("/internal/settings?error=x_link_failed", origin),
    );
  }
  // 更新対象は認証済みセッションのみを根拠に決定する。
  const discordId = session.user.id;

  try {
    const token = await exchangeCodeForToken(
      "x",
      code,
      getCallbackUrl("x", origin),
      codeVerifier,
    );
    const user = await fetchProviderUser("x", token);

    await updateMemberSns(discordId, {
      x: user.username,
      xId: user.id,
      xAvatar: user.avatar,
    });

    const successUrl = new URL(redirectTo, origin);
    successUrl.searchParams.set("success", "x_linked");
    return NextResponse.redirect(successUrl.toString());
  } catch (e) {
    console.error("X link callback error:", e);
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "x_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}
