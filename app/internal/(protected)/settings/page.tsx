import { auth } from "@/lib/auth"
import { getMember } from "@/lib/members"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import SnsSettings from "@/components/sns-settings"

const SUCCESS_MESSAGES: Record<string, string> = {
  github_linked: "GitHubと連携しました。",
  x_linked: "Xと連携しました。",
  line_linked: "LINEと連携しました。",
  linkedin_linked: "LinkedInと連携しました。",
}

const ERROR_MESSAGES: Record<string, string> = {
  github_link_failed: "GitHub連携に失敗しました。もう一度お試しください。",
  x_link_failed: "X連携に失敗しました。もう一度お試しください。",
  line_link_failed: "LINE連携に失敗しました。もう一度お試しください。",
  linkedin_link_failed: "LinkedIn連携に失敗しました。もう一度お試しください。",
}

export default async function SettingPage({
  searchParams,
}: {
  searchParams?: { success?: string; error?: string }
}) {
  const session = await auth()
  const member = await getMember(session!.user!.id)
  const { success, error } = searchParams ?? {}

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <PageHeader title="設定" />

      <Tabs defaultValue="sns" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sns" className="flex-1 sm:flex-none">SNS連携</TabsTrigger>
          <TabsTrigger value="display" className="flex-1 sm:flex-none">表示設定</TabsTrigger>
        </TabsList>

        <TabsContent value="sns" className="animate-in fade-in-50 slide-in-from-left-2 duration-300">
          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm text-muted-foreground">
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
                linkedin={member?.linkedin ?? ""}
                linkedinId={member?.linkedinId ?? ""}
                linkedinDisplayName={member?.linkedinDisplayName ?? ""}
                successMessage={success ? SUCCESS_MESSAGES[success] : undefined}
                errorMessage={error ? ERROR_MESSAGES[error] : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="animate-in fade-in-50 slide-in-from-right-2 duration-300">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground/60 text-sm">表示設定は今後追加予定です。</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
