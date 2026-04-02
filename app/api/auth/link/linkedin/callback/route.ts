import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken, fetchProviderUser, getCallbackUrl } from '@/lib/oauth-link'
import { updateMemberSns } from '@/lib/members'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_link_state_linkedin')?.value
  const discordId = cookieStore.get('oauth_link_discord_id')?.value
  const redirectTo = cookieStore.get('oauth_link_redirect')?.value ?? '/internal/settings'

  cookieStore.delete('oauth_link_state_linkedin')
  cookieStore.delete('oauth_link_discord_id')
  cookieStore.delete('oauth_link_redirect')

  if (!code || !state || state !== savedState || !discordId) {
    const errorUrl = new URL(redirectTo, request.nextUrl.origin)
    errorUrl.searchParams.set('error', 'linkedin_link_failed')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    const baseUrl = process.env.AUTH_URL ?? request.nextUrl.origin
    const token = await exchangeCodeForToken('linkedin', code, getCallbackUrl('linkedin', baseUrl))
    const user = await fetchProviderUser('linkedin', token)

    await updateMemberSns(discordId, { linkedin: user.username, linkedinId: user.id, linkedinAvatar: user.avatar })

    const successUrl = new URL(redirectTo, request.nextUrl.origin)
    successUrl.searchParams.set('success', 'linkedin_linked')
    return NextResponse.redirect(successUrl.toString())
  } catch (e) {
    console.error('LinkedIn link callback error:', e)
    const errorUrl = new URL(redirectTo, request.nextUrl.origin)
    errorUrl.searchParams.set('error', 'linkedin_link_failed')
    return NextResponse.redirect(errorUrl.toString())
  }
}
