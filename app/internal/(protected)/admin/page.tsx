import Link from "next/link";
import { getUnregisteredMembers } from "@/lib/admin/actions";
import { AdminNotificationPanel } from "@/components/admin/notification-panel";
import { RoleAssignmentPanel } from "@/components/admin/role-assignment-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, Users } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * 環境変数の絶対 ISO タイムスタンプを、JST(+09:00) 表示の
 * "YYYY-MM-DDTHH:mm" に変換する。datetime-local input の初期値として使う。
 * SSR/CSR で結果が一致するよう、ブラウザのタイムゾーンに依存しない変換にする。
 */
function isoToJstDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Asia/Tokyo の各フィールドをロケール非依存で取り出す
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const lookup = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${lookup("year")}-${lookup("month")}-${lookup("day")}T${lookup("hour")}:${lookup("minute")}`;
}

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

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">メンバー管理</h2>
        <Button asChild variant="outline">
          <Link href="/internal/admin/members">
            <Users className="h-4 w-4" />
            メンバー一覧ダッシュボード
          </Link>
        </Button>
      </section>

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

      <section className="mt-12">
        <h2 className="text-lg font-semibold mb-4">参加日時によるロール付与</h2>
        <p className="text-sm text-muted-foreground mb-4">
          指定した日時以降にDiscordサーバーへ参加し、まだ対象ロールを持っていないメンバーへ一括でロールを付与します。
        </p>
        <RoleAssignmentPanel
          defaultRoleId={process.env.NEW_MEMBER_ROLE_ID}
          defaultJoinedAfterLocal={isoToJstDatetimeLocal(
            process.env.NEW_MEMBER_JOINED_AFTER,
          )}
        />
      </section>
    </div>
  );
}
