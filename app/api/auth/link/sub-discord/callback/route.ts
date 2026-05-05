import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { linkSubAccount } from "@/lib/sub-account";

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function buildAvatarUrl(user: DiscordUser): string {
  if (!user.avatar) return "";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_link_state_sub_discord")?.value;
  const primaryDiscordId = cookieStore.get(
    "oauth_link_primary_discord_id",
  )?.value;
  const redirectTo =
    cookieStore.get("oauth_link_redirect")?.value ?? "/internal/settings";

  cookieStore.delete("oauth_link_state_sub_discord");
  cookieStore.delete("oauth_link_primary_discord_id");
  cookieStore.delete("oauth_link_redirect");

  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;
  const failRedirect = (errorCode: string) => {
    const url = new URL(redirectTo, origin);
    url.searchParams.set("error", errorCode);
    return NextResponse.redirect(url.toString());
  };

  if (!code || !state || state !== savedState || !primaryDiscordId) {
    return failRedirect("sub_discord_link_failed");
  }

  const clientId = process.env.AUTH_DISCORD_ID;
  const clientSecret = process.env.AUTH_DISCORD_SECRET;
  if (!clientId || !clientSecret) {
    return failRedirect("sub_discord_link_failed");
  }

  try {
    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/api/auth/link/sub-discord/callback`,
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Sub-Discord token exchange failed:", tokenData);
      return failRedirect("sub_discord_link_failed");
    }

    const userRes = await fetch(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = (await userRes.json()) as DiscordUser;
    if (!userRes.ok || !user.id) {
      console.error("Sub-Discord user fetch failed:", user);
      return failRedirect("sub_discord_link_failed");
    }

    const result = await linkSubAccount({
      primaryDiscordId,
      sub: {
        discordId: user.id,
        username: user.global_name ?? user.username,
        handle: user.username,
        avatar: buildAvatarUrl(user),
      },
    });

    if (!result.ok) {
      return failRedirect(`sub_discord_${result.error}`);
    }

    const successUrl = new URL(redirectTo, origin);
    successUrl.searchParams.set("success", "sub_discord_linked");
    return NextResponse.redirect(successUrl.toString());
  } catch (e) {
    console.error("Sub-Discord link callback error:", e);
    return failRedirect("sub_discord_link_failed");
  }
}
