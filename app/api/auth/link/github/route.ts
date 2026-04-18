import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateState,
  getCallbackUrl,
  PROVIDER_CONFIGS,
} from "@/lib/oauth-link";
import { cookies } from "next/headers";

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

  const config = PROVIDER_CONFIGS.github;
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured" },
      { status: 503 },
    );
  }

  const state = generateState();
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const callbackUrl = getCallbackUrl("github", baseUrl);

  const cookieStore = await cookies();
  cookieStore.set("oauth_link_state_github", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookieStore.set("oauth_link_discord_id", session.user.id, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookieStore.set(
    "oauth_link_redirect",
    new URL(request.url).searchParams.get("redirectTo") ?? "/internal/settings",
    {
      httpOnly: true,
      maxAge: 600,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  );

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
