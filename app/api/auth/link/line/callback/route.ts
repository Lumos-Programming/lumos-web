import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken, fetchProviderUser, getCallbackUrl } from '@/lib/oauth-link'
import { updateMemberSns } from '@/lib/members'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_link_state_line')?.value
  const discordId = cookieStore.get('oauth_link_discord_id')?.value

  cookieStore.delete('oauth_link_state_line')
  cookieStore.delete('oauth_link_discord_id')

  if (!code || !state || state !== savedState || !discordId) {
    return NextResponse.redirect(new URL('/internal/settings?error=line_link_failed', request.nextUrl.origin))
  }

  try {
    const baseUrl = process.env.AUTH_URL ?? request.nextUrl.origin
    const token = await exchangeCodeForToken('line', code, getCallbackUrl('line', baseUrl))
    const user = await fetchProviderUser('line', token)

    await updateMemberSns(discordId, { line: user.username, lineId: user.id })

    return NextResponse.redirect(new URL('/internal/settings?success=line_linked', request.nextUrl.origin))
  } catch (e) {
    console.error('LINE link callback error:', e)
    return NextResponse.redirect(new URL('/internal/settings?error=line_link_failed', request.nextUrl.origin))
  }
}
