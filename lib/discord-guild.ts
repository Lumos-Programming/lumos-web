/**
 * Discord Bot API integration for fetching guild members
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";

export type DiscordGuildMember = {
  user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
  };
  nick: string | null;
};

/**
 * Fetch all non-bot members from the Discord guild.
 * Handles pagination for guilds with >1000 members.
 */
export async function getGuildMembers(): Promise<DiscordGuildMember[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const allMembers: DiscordGuildMember[] = [];
  let after: string | undefined;

  while (true) {
    const url = new URL(`${DISCORD_API_BASE}/guilds/${guildId}/members`);
    url.searchParams.set("limit", "1000");
    if (after) {
      url.searchParams.set("after", after);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to fetch guild members: ${response.status} ${error}`,
      );
    }

    const members: DiscordGuildMember[] = await response.json();
    if (members.length === 0) break;

    // Filter out bots
    const humanMembers = members.filter((m) => !m.user.bot);
    allMembers.push(...humanMembers);

    // If we got fewer than 1000, we've reached the end
    if (members.length < 1000) break;

    // Use the last member's ID for pagination
    after = members[members.length - 1].user.id;
  }

  return allMembers;
}
