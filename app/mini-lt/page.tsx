import { getWeekData } from '@/lib/firebase'
import { getNextEventWeekId, formatWeekDate, getWeekLabel } from '@/lib/mini-lt/utils'
import { auth } from '@/lib/auth'
import { LTCard } from '@/components/mini-lt/LTCard'
import { WeekNavigator } from '@/components/mini-lt/WeekNavigator'
import { Header } from '@/components/mini-lt/Header'
import { DiscordEventSection } from '@/components/mini-lt/DiscordEventSection'
import { Badge } from '@/components/mini-lt/ui'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const nextEventWeekId = getNextEventWeekId()
  const weekId = params.week || nextEventWeekId
  const data = await getWeekData(weekId)
  const nextEventDate = formatWeekDate(nextEventWeekId)

  // Get label for the current week
  const weekLabel = getWeekLabel(weekId)

  // Get current user ID if logged in
  const session = await auth()
  const currentUserId = session?.user?.id

  return (
    <main>
      <Header />

      {/* Week Info Section */}
      <div className="bg-gradient-primary py-2">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xl font-bold bg-white/20 backdrop-blur-sm px-5 py-2 rounded-xl text-white">
              📅 次回の予定: {nextEventDate} 21:00〜
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
          {/* Mini LT プロジェクトとは？ */}
          <div className="bg-gradient-card rounded-2xl p-5 border border-purple-100">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <span>💡</span>
              <span>Mini LT プロジェクトとは？</span>
            </h3>
            <p className="text-sm text-gray-600 text-center">
              大きなLTイベントとは別に <br />
              もっとカジュアルに、雑談チックに
              <br />
              やってることや最近取り組んでいることなど
              <br />
              毎週小さな進捗をシェアし合える場です。
              <br />
              初めての方も誰でも大歓迎!！
            </p>
          </div>

          {/* あなたも話してみませんか？ */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-5 border-2 border-orange-200">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                💬 あなたも話してみませんか？
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                やってること、進捗、ちょっとした知見...なんでもOK！
                <br />
                資料なし・5分だけでも大歓迎です ✨
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-4 text-xs">
                <span className="bg-white px-3 py-1 rounded-full text-gray-700">🔰 初心者歓迎</span>
                <span className="bg-white px-3 py-1 rounded-full text-gray-700">📄 資料なしOK</span>
                <span className="bg-white px-3 py-1 rounded-full text-gray-700">⏱️ 5分でもOK</span>
                <span className="bg-white px-3 py-1 rounded-full text-gray-700">💭 雑談ベース</span>
              </div>
              <Link href="/mini-lt/submit">
                <button className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2 mx-auto">
                  <span className="text-xl">🎤</span>
                  <span>気軽に発表登録してみる</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-2 mb-4">
          <WeekNavigator currentWeek={weekId} baseUrl="/" />
        </div>

        {/* Discord Event Call to Action & Interested Users */}
        {data.discordEventId && (
          <DiscordEventSection
            eventId={data.discordEventId}
            eventUrl={data.discordEventUrl}
            currentUserId={currentUserId}
          />
        )}

        {data.talks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-lg font-semibold text-gray-700 mb-1">
              {weekLabel}はまだ誰も登録していません
            </p>
            <p className="text-sm text-muted-foreground">あなたが最初の一人になりませんか？</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.talks
              .sort((a, b) => a.order - b.order)
              .map((talk, index) => (
                <div
                  key={talk.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <LTCard talk={talk} />
                </div>
              ))}
          </div>
        )}

        <footer className="mt-12 text-center pb-8">
          <Link href="/mini-lt/submit">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 px-5 py-2 transition-all hover:scale-105"
            >
              🔐 発表登録・管理（Discordログイン）
            </Badge>
          </Link>
        </footer>
      </div>

      {/* Floating Action Button */}
      <Link href="/mini-lt/submit">
        <button className="fixed bottom-8 right-8 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 z-50 animate-float group flex items-center gap-2 font-bold">
          <span className="text-2xl">➕</span>
          <span className="text-sm">発表登録</span>
        </button>
      </Link>
    </main>
  )
}
