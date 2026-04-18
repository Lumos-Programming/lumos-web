import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMember } from "@/lib/members";
import { signOptoutRequest } from "@/lib/discord-optout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import SnsSettings from "@/components/sns-settings";

const SUCCESS_MESSAGES: Record<string, string> = {
  github_linked: "GitHubと連携しました。",
  x_linked: "Xと連携しました。",
  line_linked: "LINEと連携しました。",
  line_relinked: "LINEを再連携しました。",
};

const ERROR_MESSAGES: Record<string, string> = {
  github_link_failed: "GitHub連携に失敗しました。もう一度お試しください。",
  x_link_failed: "X連携に失敗しました。もう一度お試しください。",
  line_link_failed: "LINE連携に失敗しました。もう一度お試しください。",
};

export default async function SettingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    line_group?: string;
    not_friend?: string;
  }>;
}) {
  const session = await auth();
  const discordId = session!.user!.id;
  const member = await getMember(discordId);
  const { success, error, line_group, not_friend } = (await searchParams) ?? {};
  const optoutPath = `/optout/${discordId}/${signOptoutRequest(discordId)}`;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-spring-up">
      <PageHeader title="設定" />

      <Tabs defaultValue="sns" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sns" className="flex-1 sm:flex-none">
            SNS連携
          </TabsTrigger>
          <TabsTrigger value="display" className="flex-1 sm:flex-none">
            表示設定
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1 sm:flex-none">
            アカウント
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="sns"
          className="animate-in fade-in-50 slide-in-from-left-2 duration-300"
        >
          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm text-muted-foreground">
                各SNSアカウントを連携すると、プロフィール編集ページで公開設定ができます。
              </p>
            </CardHeader>
            <CardContent>
              <SnsSettings
                isAlumni={member?.memberType === "卒業生"}
                discordUsername={member?.discordUsername ?? ""}
                github={member?.github ?? ""}
                githubId={member?.githubId ?? ""}
                x={member?.x ?? ""}
                xId={member?.xId ?? ""}
                line={member?.line ?? ""}
                lineId={member?.lineId ?? ""}
                lineLinkedAt={member?.lineLinkedAt}
                linkedin={member?.linkedin ?? ""}
                lineGroupPending={line_group === "not_joined"}
                lineBotFriendUrl={process.env.LINE_BOT_FRIEND_URL}
                isBotFriend={line_group === "not_joined" && not_friend !== "1"}
                successMessage={success ? SUCCESS_MESSAGES[success] : undefined}
                errorMessage={error ? ERROR_MESSAGES[error] : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="display"
          className="animate-in fade-in-50 slide-in-from-right-2 duration-300"
        >
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground/60 text-sm">
                表示設定は今後追加予定です。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="account"
          className="animate-in fade-in-50 slide-in-from-right-2 duration-300"
        >
          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm text-muted-foreground">
                アカウントに関する操作です。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-rose-200/60 bg-rose-50/40 p-4 dark:border-rose-400/20 dark:bg-rose-400/[0.04]">
                <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Lumosを退会する
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  退会手続きを進めると、Lumos
                  Webのメンバー機能が利用できなくなります。
                  <br />
                  Discordサーバーには引き続き参加いただけますが、4月末を目処にメンバー用チャンネルは閲覧できなくなります。
                </p>
                <p className="mt-2 text-xs text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                  ⚠️
                  すでに今年度の会費をお支払いいただいている場合、会費の返還はできませんのでご了承ください。
                </p>
                <Link
                  href={optoutPath}
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-rose-300/60 bg-transparent px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100/60 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-400/10"
                >
                  退会手続きへ進む
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
