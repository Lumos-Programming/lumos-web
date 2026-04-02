import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateState, generateCodeVerifier, generateCodeChallenge, getCallbackUrl, PROVIDER_CONFIGS } from '@/lib/oauth-link'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = PROVIDER_CONFIGS.x
  const clientId = process.env[config.clientIdEnv]
  if (!clientId) {
    return NextResponse.json({ error: 'X OAuth not configured' }, { status: 503 })
  }

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'
  const callbackUrl = getCallbackUrl('x', baseUrl)

  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'
  cookieStore.set('oauth_link_state_x', state, { httpOnly: true, maxAge: 600, path: '/', secure: isProduction, sameSite: 'lax' })
  cookieStore.set('oauth_link_verifier_x', codeVerifier, { httpOnly: true, maxAge: 600, path: '/', secure: isProduction, sameSite: 'lax' })
  cookieStore.set('oauth_link_discord_id', session.user.id, { httpOnly: true, maxAge: 600, path: '/', secure: isProduction, sameSite: 'lax' })
  cookieStore.set('oauth_link_redirect', new URL(request.url).searchParams.get('redirectTo') ?? '/internal/settings', { httpOnly: true, maxAge: 600, path: '/', secure: isProduction, sameSite: 'lax' })

  const url = new URL(config.authUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  return NextResponse.redirect(url.toString())
}
