import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import {
  getOrCreateMember,
  getMember,
  isDiscordIdOptedOut,
} from "@/lib/members";
import {
  sendDiscordDm,
  buildWelcomeMessage,
  buildLoginMessage,
  buildWelcomeBackMessage,
  calcProfileCompletion,
} from "@/lib/discord-dm";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Discord Snowflake ID (17-19 桁の数値文字列) かを判定する
 */
export function isValidSnowflake(id: string | undefined): boolean {
  if (!id) return false;
  return /^\d{17,19}$/.test(id);
}

/**
 * ログイン通知
 * - (新規ログイン) → Welcome DM
 * - (7日ぶりのログイン) → Welcome Back DM
 * - (通常のログイン) → ログイン通知 DM
 */
async function sendLoginDm(
  discordId: string,
  dmUsername: string,
  isNewMember: boolean,
  lastLoginAt: Date | null,
): Promise<void> {
  if (isNewMember) {
    sendDiscordDm(discordId, buildWelcomeMessage(dmUsername)).catch((e) =>
      console.error("Failed to send welcome DM", e),
    );
    return;
  }

  const isReturning =
    lastLoginAt && Date.now() - lastLoginAt.getTime() >= SEVEN_DAYS_MS;

  if (isReturning) {
    // 7日以上ぶり → welcome back メッセージ + プロフィール完成度を案内
    const member = await getMember(discordId);
    if (!member) return;
    const completion = calcProfileCompletion(member);
    sendDiscordDm(
      discordId,
      buildWelcomeBackMessage(dmUsername, discordId, completion),
    ).catch((e) => console.error("Failed to send welcome back DM", e));
    return;
  }

  // 通常ログイン
  sendDiscordDm(discordId, buildLoginMessage(dmUsername)).catch((e) =>
    console.error("Failed to send login DM", e),
  );
}

/**
 * Discord guild member 情報を取得し admin ロールを付与しているかを判定する
 */
async function fetchIsAdmin(accessToken: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  if (!guildId || !adminRoleId) return false;

  try {
    const res = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const member = await res.json();
    return member.roles?.includes(adminRoleId) === true;
  } catch (e) {
    console.error("Failed to fetch guild member info", e);
    return false;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: [
    Discord({
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+guilds+guilds.members.read",
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/internal`;
    },

    async session({ session, token }) {
      // token.sub には Discord ユーザー ID が入る
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.isAdmin !== undefined) {
        session.user.isAdmin = token.isAdmin as boolean;
      }
      session.user.faceImage = (token.faceImage as string | null) ?? null;
      session.user.optedOut = token.optedOut === true;
      return session;
    },

    async jwt({ token, account, profile, trigger }) {
      // 初回サインイン: member doc の upsert、ログイン DM 送信、admin 判定
      if (account?.provider === "discord") {
        const discordId = account.providerAccountId;
        token.sub = discordId;

        const { isNewMember, lastLoginAt } = await getOrCreateMember(
          discordId,
          token.name ?? "",
          token.picture ?? "",
          (profile as { username?: string })?.username ?? undefined,
        );

        await sendLoginDm(
          discordId,
          token.name ?? "メンバー",
          isNewMember,
          lastLoginAt,
        );

        const member = await getMember(discordId);
        token.faceImage = member?.faceImage ?? null;

        if (account.access_token) {
          token.isAdmin = await fetchIsAdmin(account.access_token);
        } else {
          token.isAdmin = false;
        }
      }

      // session.update() 呼び出し時: faceImage を最新化
      if (trigger === "update" && token.sub) {
        const member = await getMember(token.sub);
        token.faceImage = member?.faceImage ?? null;
      }

      // 毎リクエスト: 退会済みフラグを members コレクションから読み直してセッションに反映
      if (token.sub) {
        try {
          token.optedOut = await isDiscordIdOptedOut(token.sub);
        } catch (e) {
          console.error("Failed to check opt-out status", e);
        }
      }

      return token;
    },

    async signIn({ account }) {
      if (account?.provider !== "discord") return true;

      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) return true; // 未設定なら検証をバイパス

      try {
        const res = await fetch("https://discord.com/api/users/@me/guilds", {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        const guilds = await res.json();
        const isMember = guilds.some((g: { id: string }) => g.id === guildId);
        return isMember ? true : "/error/auth";
      } catch (e) {
        console.error("Failed to fetch guilds", e);
        return false;
      }
    },
  },
});

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.isAdmin === true;
}
