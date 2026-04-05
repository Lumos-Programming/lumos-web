import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
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
  const discordId = cookieStore.get("oauth_link_discord_id")?.value;
  const redirectTo =
    cookieStore.get("oauth_link_redirect")?.value ?? "/internal/settings";

  cookieStore.delete("oauth_link_state_x");
  cookieStore.delete("oauth_link_verifier_x");
  cookieStore.delete("oauth_link_discord_id");
  cookieStore.delete("oauth_link_redirect");

  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;

  if (!code || !state || state !== savedState || !discordId || !codeVerifier) {
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "x_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }

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
