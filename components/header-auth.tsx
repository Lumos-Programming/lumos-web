import { auth } from '@/lib/auth'
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
    <Link href="/api/auth/signin/discord">
      <Button size="sm" className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
        Discordでログイン
      </Button>
    </Link>
  )
}
