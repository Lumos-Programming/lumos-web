import { getUnregisteredMembers } from "@/lib/admin/actions";
import { AdminNotificationPanel } from "@/components/admin/notification-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  let members;
  let error: string | null = null;
  try {
    members = await getUnregisteredMembers();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6" />
        <div>
          <p className="text-sm text-muted-foreground">Lumos 管理ツール</p>
          <h1 className="text-2xl font-bold">登録案内通知</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Discordサーバーに参加しているがLumos
        Webに未登録のメンバーへ、登録案内を送信できます。
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
    </div>
  );
}
