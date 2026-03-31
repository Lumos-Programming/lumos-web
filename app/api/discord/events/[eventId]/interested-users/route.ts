import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getEventInterestedUsers, getDiscordAvatarUrl } from '@/lib/discord'

export const dynamic = 'force-dynamic'

/**
 * Cached function to fetch interested users from Discord API
 * Cache duration: 30 seconds
 */
const getCachedInterestedUsers = unstable_cache(
  async (eventId: string) => {
    const discordUsers = await getEventInterestedUsers(eventId)

    return discordUsers.map(eventUser => ({
      userId: eventUser.user.id,
      username: eventUser.user.global_name || eventUser.user.username,
      avatarUrl: getDiscordAvatarUrl(
        eventUser.user.id,
        eventUser.member?.avatar || eventUser.user.avatar,
        eventUser.user.discriminator
      ),
    }))
  },
  ['discord-interested-users'],
  {
    revalidate: 20, // Cache for 30 seconds
    tags: ['discord-interested-users'],
  }
)

/**
 * GET /api/discord/events/[eventId]/interested-users
 *
 * Returns a list of users who marked "interested" in the Discord event
 * Cached for 30 seconds to avoid rate limiting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Fetch interested users with caching
    const users = await getCachedInterestedUsers(eventId)

    return NextResponse.json({ users, count: users.length })
  } catch (error) {
    console.error('Failed to fetch interested users:', error)
    return NextResponse.json({ error: 'Failed to fetch interested users' }, { status: 500 })
  }
}
