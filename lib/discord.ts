/**
 * Discord API integration for creating and managing scheduled events
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";

export type DiscordEventEntityMetadata = {
  location: string;
};

export type CreateDiscordEventParams = {
  name: string;
  description: string;
  scheduledStartTime: string; // ISO8601 timestamp
  scheduledEndTime: string; // ISO8601 timestamp
  location: string;
};

export type DiscordEvent = {
  id: string;
  guild_id: string;
  name: string;
  description: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  entity_type: number;
  entity_metadata: DiscordEventEntityMetadata;
  status: number;
};

/**
 * Create a Discord scheduled event
 */
export async function createDiscordEvent(
  params: CreateDiscordEventParams,
): Promise<DiscordEvent> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        scheduled_start_time: params.scheduledStartTime,
        scheduled_end_time: params.scheduledEndTime,
        privacy_level: 2, // GUILD_ONLY
        entity_type: 3, // EXTERNAL
        entity_metadata: {
          location: params.location,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to create Discord event: ${response.status} ${error}`,
    );
  }

  return response.json();
}

/**
 * Update a Discord scheduled event
 */
export async function updateDiscordEvent(
  eventId: string,
  params: Partial<CreateDiscordEventParams>,
): Promise<DiscordEvent> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const body: Record<string, unknown> = {};
  if (params.name) body.name = params.name;
  if (params.description) body.description = params.description;
  if (params.scheduledStartTime)
    body.scheduled_start_time = params.scheduledStartTime;
  if (params.scheduledEndTime)
    body.scheduled_end_time = params.scheduledEndTime;
  if (params.location) {
    body.entity_metadata = { location: params.location };
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to update Discord event: ${response.status} ${error}`,
    );
  }

  return response.json();
}

/**
 * Delete a Discord scheduled event
 */
export async function deleteDiscordEvent(eventId: string): Promise<void> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to delete Discord event: ${response.status} ${error}`,
    );
  }
}

/**
 * Get Discord event URL
 */
export function getDiscordEventUrl(eventId: string): string {
  const guildId = process.env.DISCORD_GUILD_ID;
  return `https://discord.com/events/${guildId}/${eventId}`;
}

export type DiscordEventUser = {
  guild_scheduled_event_id: string;
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    global_name: string | null;
  };
  member?: {
    avatar: string | null;
    nick: string | null;
  };
};

/**
 * Get users who marked "interested" in a Discord event
 */
export async function getEventInterestedUsers(
  eventId: string,
): Promise<DiscordEventUser[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events/${eventId}/users?limit=100&with_member=true`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to get event interested users: ${response.status} ${error}`,
    );
  }

  return response.json();
}

/**
 * Get avatar URL for a Discord user
 */
export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null,
  discriminator: string,
): string {
  if (avatarHash) {
    // User has custom avatar
    const extension = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=128`;
  } else {
    // Use default avatar based on discriminator
    const defaultAvatarNumber = parseInt(discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }
}
