import { auth, signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function HeaderAuth() {
  const session = await auth()

  if (session) {
    return (
      <Link href="/internal">
        <Button variant="outline" size="sm">
          {session.user?.name ?? 'マイページ'}
        </Button>
      </Link>
    )
  }

  return (
    <form
      action={async () => {
        'use server'
        await signIn('discord')
      }}
    >
      <Button type="submit" size="sm" className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
        Discordでログイン
      </Button>
    </form>
  )
}
