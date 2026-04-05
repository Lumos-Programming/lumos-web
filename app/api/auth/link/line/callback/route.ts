import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForTokenFull,
  fetchProviderUser,
  getCallbackUrl,
} from "@/lib/oauth-link";
import { updateMemberSns } from "@/lib/members";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_link_state_line")?.value;
  const discordId = cookieStore.get("oauth_link_discord_id")?.value;
  const redirectTo =
    cookieStore.get("oauth_link_redirect")?.value ?? "/internal/settings";

  cookieStore.delete("oauth_link_state_line");
  cookieStore.delete("oauth_link_discord_id");
  cookieStore.delete("oauth_link_redirect");

  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;

  if (!code || !state || state !== savedState || !discordId) {
    return NextResponse.redirect(
      new URL("/internal/settings?error=line_link_failed", origin),
    );
  }

  try {
    const tokenResponse = await exchangeCodeForTokenFull(
      "line",
      code,
      getCallbackUrl("line", origin),
    );
    const user = await fetchProviderUser("line", tokenResponse.access_token);

    await updateMemberSns(discordId, {
      line: user.username,
      lineId: user.id,
      lineAvatar: user.avatar,
      lineAccessToken: tokenResponse.access_token,
      lineRefreshToken: tokenResponse.refresh_token,
      lineTokenExpiresAt: tokenResponse.expires_in
        ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
        : undefined,
    });

    const successUrl = new URL(redirectTo, origin);
    successUrl.searchParams.set("success", "line_linked");
    return NextResponse.redirect(successUrl.toString());
  } catch (e) {
    console.error("LINE link callback error:", e);
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "line_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}
