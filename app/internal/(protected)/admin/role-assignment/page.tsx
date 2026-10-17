import { RoleAssignmentPanel } from "@/components/admin/role-assignment-panel";
import { CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

function isoToJstDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const lookup = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${lookup("year")}-${lookup("month")}-${lookup("day")}T${lookup("hour")}:${lookup("minute")}`;
}

export default function AdminRoleAssignmentPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CalendarClock className="h-6 w-6" />
        <div>
          <p className="text-sm text-muted-foreground">Lumos 管理ツール</p>
          <h1 className="text-2xl font-bold">参加日時によるロール付与</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        指定した日時以降にDiscordサーバーへ参加し、対象ロールを持っていないメンバーへロールを付与します。
      </p>
      <RoleAssignmentPanel
        defaultRoleId={process.env.NEW_MEMBER_ROLE_ID}
        defaultJoinedAfterLocal={isoToJstDatetimeLocal(
          process.env.NEW_MEMBER_JOINED_AFTER,
        )}
      />
    </div>
  );
}
