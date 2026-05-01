import { getAdminMembers } from "@/lib/admin/actions";
import { MemberDashboardTable } from "@/components/admin/member-dashboard-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  let members;
  let error: string | null = null;
  try {
    members = await getAdminMembers();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">メンバー管理</h1>
        {members && (
          <span className="text-sm text-muted-foreground">
            全 {members.length} 件
          </span>
        )}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>メンバー一覧の取得に失敗しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <MemberDashboardTable members={members!} />
      )}
    </div>
  );
}
