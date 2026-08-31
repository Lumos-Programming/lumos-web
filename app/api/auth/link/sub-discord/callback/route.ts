import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { linkSubAccount } from "@/lib/sub-account";

const SETTINGS_PATH = "/internal/settings";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_link_state_sub_discord")?.value;

  cookieStore.delete("oauth_link_state_sub_discord");

  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;
  // 戻り先は設定ページ固定。外から渡させないのでオープンリダイレクトにならない。
  const failRedirect = (errorCode: string) => {
    const url = new URL(SETTINGS_PATH, origin);
    url.searchParams.set("error", errorCode);
    return NextResponse.redirect(url.toString());
  };

  // state は CSRF 対策として必要 (攻撃者の code を被害者のブラウザで踏ませても、
  // 被害者側の cookie と一致しないので弾ける)。
  if (!code || !state || state !== savedState) {
    return failRedirect("sub_discord_link_failed");
  }

  // 書き込み対象のメインアカウントはセッションだけを根拠に決める。
  // Cookie は送信側が自由に書き換えられるので身元の根拠にはできない。
  const session = await auth();
  if (!session?.user?.id || session.user.optedOut) {
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
      primaryDiscordId: session.user.id,
      sub: {
        discordId: user.id,
        username: user.global_name ?? user.username,
        handle: user.username,
        // members コレクションと同様、完全 URL ではなく avatar hash を保存する
        avatar: user.avatar ?? "",
      },
    });

    if (!result.ok) {
      return failRedirect(`sub_discord_${result.error}`);
    }

    const successUrl = new URL(SETTINGS_PATH, origin);
    successUrl.searchParams.set("success", "sub_discord_linked");
    return NextResponse.redirect(successUrl.toString());
  } catch (e) {
    console.error("Sub-Discord link callback error:", e);
    return failRedirect("sub_discord_link_failed");
  }
}
