import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken, fetchProviderUser, getCallbackUrl } from '@/lib/oauth-link'
import { updateMemberSns } from '@/lib/members'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_link_state_github')?.value
  const discordId = cookieStore.get('oauth_link_discord_id')?.value

  cookieStore.delete('oauth_link_state_github')
  cookieStore.delete('oauth_link_discord_id')

  if (!code || !state || state !== savedState || !discordId) {
    return NextResponse.redirect(new URL('/internal/settings?error=github_link_failed', request.nextUrl.origin))
  }

  try {
    const baseUrl = process.env.AUTH_URL ?? request.nextUrl.origin
    const token = await exchangeCodeForToken('github', code, getCallbackUrl('github', baseUrl))
    const user = await fetchProviderUser('github', token)

    await updateMemberSns(discordId, { github: user.username, githubId: user.id })

    return NextResponse.redirect(new URL('/internal/settings?success=github_linked', request.nextUrl.origin))
  } catch (e) {
    console.error('GitHub link callback error:', e)
    return NextResponse.redirect(new URL('/internal/settings?error=github_link_failed', request.nextUrl.origin))
  }
}
