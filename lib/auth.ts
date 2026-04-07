import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getOrCreateMember, getMember } from "@/lib/members";

/**
 * Check if a string is a valid Discord Snowflake ID
 * Snowflakes are 17-19 digit numbers
 */
export function isValidSnowflake(id: string | undefined): boolean {
  if (!id) return false;
  // Discord Snowflakes are numeric strings of 17-19 digits
  return /^\d{17,19}$/.test(id);
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
      // token.sub contains the Discord User ID
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.isAdmin !== undefined) {
        session.user.isAdmin = token.isAdmin as boolean;
      }
      session.user.faceImage = (token.faceImage as string | null) ?? null;
      return session;
    },
    async jwt({ token, account, profile, trigger }) {
      // Store Discord User ID (Snowflake) in token on first sign in
      // account.providerAccountId contains the actual Discord User ID (Snowflake format)
      if (account?.provider === "discord") {
        // Use providerAccountId which is the Discord User ID (Snowflake)
        token.sub = account.providerAccountId;
        // Create or update member document in Firestore
        await getOrCreateMember(
          account.providerAccountId,
          token.name ?? "",
          token.picture ?? "",
          (profile as { username?: string })?.username ?? undefined,
        );
        // Fetch faceImage on first sign in
        const member = await getMember(account.providerAccountId);
        token.faceImage = member?.faceImage ?? null;
      }

      // Refresh faceImage when session.update() is called
      if (trigger === "update" && token.sub) {
        const member = await getMember(token.sub);
        token.faceImage = member?.faceImage ?? null;
      }

      // Check admin role on first sign in
      if (account?.provider === "discord" && account.access_token) {
        const guildId = process.env.DISCORD_GUILD_ID;
        const adminRoleId = process.env.ADMIN_ROLE_ID;

        if (guildId && adminRoleId) {
          try {
            const res = await fetch(
              `https://discord.com/api/users/@me/guilds/${guildId}/member`,
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                },
              },
            );
            const member = await res.json();
            token.isAdmin = member.roles?.includes(adminRoleId) || false;
          } catch (e) {
            console.error("Failed to fetch guild member info", e);
            token.isAdmin = false;
          }
        } else {
          token.isAdmin = false;
        }
      }
      return token;
    },
    async signIn({ account }) {
      if (account?.provider === "discord") {
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!guildId) return true; // Bypass if not configured

        try {
          const res = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          });
          const guilds = await res.json();
          const isMember = guilds.some((g: { id: string }) => g.id === guildId);
          if (!isMember) return "/auth-error";
          return true;
        } catch (e) {
          console.error("Failed to fetch guilds", e);
          return false;
        }
      }
      return true;
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
