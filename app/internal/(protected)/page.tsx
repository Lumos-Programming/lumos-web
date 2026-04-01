import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Users, CalendarDays, UserCircle, Settings } from "lucide-react"

const NAV_ITEMS = [
  {
    href: "/internal/members",
    icon: Users,
    label: "メンバー一覧",
    description: "サークルメンバーの確認・管理",
  },
  {
    href: "/internal/events",
    icon: CalendarDays,
    label: "イベント一覧",
    description: "開催済み・予定イベントの確認",
  },
  {
    href: "/internal/profile",
    icon: UserCircle,
    label: "プロフィール",
    description: "自分のプロフィールの編集・公開設定",
  },
  {
    href: "/internal/settings",
    icon: Settings,
    label: "設定",
    description: "アカウントや表示の設定",
  },
]

export default function InternalPage() {
  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900">
      <section className="section-padding">
        <div className="container mx-auto container-padding max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">メンバーページ</h1>
            <p className="text-muted-foreground">各ページへのリンクです</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {NAV_ITEMS.map(({ href, icon: Icon, label, description }) => (
              <Link key={href} href={href}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-border bg-card">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="p-3 rounded-xl bg-gradient-primary text-white shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}