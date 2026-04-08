import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForTokenFull,
  fetchProviderUser,
  getCallbackUrl,
} from "@/lib/oauth-link";
import { updateMemberSns } from "@/lib/members";
import {
  checkLineGroupMembership,
  checkLineBotFriendship,
  createLineInvitation,
} from "@/lib/line-invite";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const friendshipChanged = searchParams.get("friendship_status_changed");

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

    // Bot友だち状態を判定
    // friendship_status_changed=true → 今回追加した（友だち）
    // friendship_status_changed=false → 追加しなかった（未友だち or ブロック中）
    // null → 同意画面スキップ → APIで確認
    let isFriend: boolean;
    if (friendshipChanged === "true") {
      isFriend = true;
    } else if (friendshipChanged === "false") {
      isFriend = false;
    } else {
      isFriend = await checkLineBotFriendship(tokenResponse.access_token);
    }

    const isOnboarding = redirectTo.includes("/internal/onboarding");
    const isSettings = redirectTo.includes("/internal/settings");

    if (isSettings) {
      // 再連携フロー: DB更新せず、招待コードに仮情報を保存
      const inGroup = await checkLineGroupMembership(user.id);
      if (inGroup) {
        // 新アカウントが既にグループ参加済み → 即座にDB更新
        await updateMemberSns(discordId, {
          line: user.username,
          lineId: user.id,
          lineAvatar: user.avatar,
          lineLinkedAt: Math.floor(Date.now() / 1000),
          lineAccessToken: tokenResponse.access_token,
          lineRefreshToken: tokenResponse.refresh_token,
          lineTokenExpiresAt: tokenResponse.expires_in
            ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
            : undefined,
        });

        const successUrl = new URL(redirectTo, origin);
        successUrl.searchParams.set("success", "line_relinked");
        return NextResponse.redirect(successUrl.toString());
      }

      // 未参加 → 仮情報付き招待コード発行（push DMは送らず、Bot友だち追加を促す）
      await createLineInvitation(discordId, user.id, {
        pendingLine: user.username,
        pendingLineId: user.id,
        pendingLineAvatar: user.avatar,
        pendingLineAccessToken: tokenResponse.access_token,
        pendingLineRefreshToken: tokenResponse.refresh_token,
        pendingLineTokenExpiresAt: tokenResponse.expires_in
          ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
          : undefined,
      });

      const successUrl = new URL(redirectTo, origin);
      successUrl.searchParams.set("success", "line_linked");
      successUrl.searchParams.set("line_group", "not_joined");
      if (!isFriend) {
        successUrl.searchParams.set("not_friend", "1");
      }
      return NextResponse.redirect(successUrl.toString());
    }

    // 初回連携フロー（onboarding含むデフォルト）
    await updateMemberSns(discordId, {
      line: user.username,
      lineId: user.id,
      lineAvatar: user.avatar,
      lineLinkedAt: Math.floor(Date.now() / 1000),
      lineAccessToken: tokenResponse.access_token,
      lineRefreshToken: tokenResponse.refresh_token,
      lineTokenExpiresAt: tokenResponse.expires_in
        ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
        : undefined,
    });

    const successUrl = new URL(redirectTo, origin);
    successUrl.searchParams.set("success", "line_linked");

    if (isOnboarding) {
      const inGroup = await checkLineGroupMembership(user.id);
      if (!inGroup) {
        // グループ未参加 → 招待コード発行（push DMは送らず、Bot友だち追加を促す）
        await createLineInvitation(discordId, user.id);
        successUrl.searchParams.set("line_group", "not_joined");
        if (!isFriend) {
          successUrl.searchParams.set("not_friend", "1");
        }
      }
    }

    return NextResponse.redirect(successUrl.toString());
  } catch (e) {
    console.error("LINE link callback error:", e);
    const errorUrl = new URL(redirectTo, origin);
    errorUrl.searchParams.set("error", "line_link_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}
