import { auth } from "@/lib/auth"
import { getMember } from "@/lib/members"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SnsSettings from "@/components/sns-settings"

const SUCCESS_MESSAGES: Record<string, string> = {
  github_linked: "GitHubと連携しました。",
  x_linked: "Xと連携しました。",
  line_linked: "LINEと連携しました。",
}

const ERROR_MESSAGES: Record<string, string> = {
  github_link_failed: "GitHub連携に失敗しました。もう一度お試しください。",
  x_link_failed: "X連携に失敗しました。もう一度お試しください。",
  line_link_failed: "LINE連携に失敗しました。もう一度お試しください。",
}

export default async function SettingPage({
  searchParams,
}: {
  searchParams?: { success?: string; error?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/api/auth/signin")

  const member = await getMember(session.user.id)
  const { success, error } = searchParams ?? {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">SNS連携設定</h2>
          <Button asChild variant="outline">
            <Link href="/internal/profile">← プロフィールに戻る</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <p className="text-sm text-gray-500">
              各SNSアカウントを連携すると、プロフィール編集ページで公開設定ができます。
            </p>
          </CardHeader>
          <CardContent>
            <SnsSettings
              discordUsername={member?.discordUsername ?? ""}
              github={member?.github ?? ""}
              githubId={member?.githubId ?? ""}
              x={member?.x ?? ""}
              xId={member?.xId ?? ""}
              line={member?.line ?? ""}
              lineId={member?.lineId ?? ""}
              successMessage={success ? SUCCESS_MESSAGES[success] : undefined}
              errorMessage={error ? ERROR_MESSAGES[error] : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
