import { auth, isAdmin } from '@/lib/auth'
import { getWeekData } from '@/lib/firebase'
import { getNextEventWeekId, formatWeekDate } from '@/lib/mini-lt/utils'
import {
  createWeekEvent,
  syncWeekEventDescription,
  deleteWeekEvent,
} from '@/lib/mini-lt/actions/discord-events'
import { WeekNavigator } from '@/components/mini-lt/WeekNavigator'
import { Header } from '@/components/mini-lt/Header'
import { InterestedUsers } from '@/components/mini-lt/InterestedUsers'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/mini-lt/ui'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const session = await auth()
  const userIsAdmin = await isAdmin()

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>🔐 Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Admin機能を使用するにはログインが必要です</p>
            <Link href="/mini-lt/submit">
              <Button>ログインページへ</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!userIsAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>⛔ アクセス拒否</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">このページにアクセスする権限がありません</p>
            <Link href="/">
              <Button variant="outline">トップページへ戻る</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const params = await searchParams
  const weekId = params.week || getNextEventWeekId()
  const data = await getWeekData(weekId)
  const weekDateDisplay = formatWeekDate(weekId)

  return (
    <main>
      <Header />

      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">⚙️ Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Discord イベント管理</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50">
                  👤 {session.user?.name}
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <WeekNavigator currentWeek={weekId} baseUrl="/admin" showSendButton />
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Discord Event 状態: {weekDateDisplay}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.discordEventId ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">✓ 作成済み</Badge>
                    {data.discordEventUrl && (
                      <a
                        href={data.discordEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:underline"
                      >
                        → Discordで開く
                      </a>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <InterestedUsers eventId={data.discordEventId} />
                  </div>

                  <div className="flex gap-2">
                    <form action={syncWeekEventDescription.bind(null, weekId, data.discordEventId)}>
                      <Button type="submit" variant="outline">
                        📝 Event説明を更新
                      </Button>
                    </form>
                    <form action={deleteWeekEvent.bind(null, weekId, data.discordEventId)}>
                      <Button type="submit" variant="outline" className="text-red-600">
                        🗑️ Eventを削除
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Badge variant="outline">未作成</Badge>
                  <form action={createWeekEvent.bind(null, weekId)}>
                    <Button type="submit">➕ Discord Eventを作成</Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>登録済み発表 ({data.talks.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.talks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  まだ発表が登録されていません
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.talks
                    .sort((a, b) => a.order - b.order)
                    .map(talk => (
                      <li
                        key={talk.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold">
                            {talk.order}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{talk.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              発表者: {talk.presenterName}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Link href="/">
              <Button variant="outline">← トップページへ戻る</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
