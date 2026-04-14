import { getUnregisteredMembers } from "@/lib/admin/actions";
import { AdminNotificationPanel } from "@/components/admin/notification-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let members;
  let error: string | null = null;
  try {
    members = await getUnregisteredMembers();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="container max-w-3xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">管理者ページ</h1>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">登録案内通知</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Discordサーバーに参加しているがLumos Webに未登録のメンバーに、Discord
          DMで登録案内を送信できます。
        </p>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>メンバー一覧の取得に失敗しました</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{error}</p>
              {error.includes("Missing Access") && (
                <p className="text-sm">
                  Discord Developer PortalでBotの「Server Members
                  Intent」を有効にしてください。
                </p>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <AdminNotificationPanel members={members!} />
        )}
      </section>
    </div>
  );
}
