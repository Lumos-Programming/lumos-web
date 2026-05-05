import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { generateState } from "@/lib/oauth-link";
import { unlinkSubAccount } from "@/lib/sub-account";

const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const SCOPE = "identify";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.optedOut) {
    return NextResponse.json(
      { error: "退会済みアカウントでは操作できません" },
      { status: 403 },
    );
  }

  const clientId = process.env.AUTH_DISCORD_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Discord OAuth not configured" },
      { status: 503 },
    );
  }

  const state = generateState();
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/auth/link/sub-discord/callback`;

  const cookieStore = await cookies();
  const cookieBase = {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  cookieStore.set("oauth_link_state_sub_discord", state, cookieBase);
  cookieStore.set("oauth_link_primary_discord_id", session.user.id, cookieBase);
  cookieStore.set(
    "oauth_link_redirect",
    new URL(request.url).searchParams.get("redirectTo") ?? "/internal/settings",
    cookieBase,
  );

  const url = new URL(DISCORD_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  // 毎回アカウント選択を強制 (メインと別アカウントを選ばせるため)
  url.searchParams.set("prompt", "consent");

  return NextResponse.redirect(url.toString());
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.optedOut) {
    return NextResponse.json(
      { error: "退会済みアカウントでは操作できません" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    subDiscordId?: string;
  } | null;
  if (!body?.subDiscordId) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const result = await unlinkSubAccount({
    primaryDiscordId: session.user.id,
    subDiscordId: body.subDiscordId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
