import { auth } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { getGuildMemberList } from "@/lib/admin/dev-tools-actions";
import { DevToolsPanel } from "@/components/admin/dev-tools-panel";
import { ShieldAlert, Wrench, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function DevToolsPage() {
  if (isProduction()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">アクセス拒否</h1>
        <p className="text-muted-foreground">
          本番環境ではこのページは使用できません。
        </p>
      </div>
    );
  }

  const session = await auth();
  const myDiscordId = session?.user?.id ?? "";
  const myName = session?.user?.name ?? "自分";

  let members;
  let error: string | null = null;
  try {
    members = await getGuildMemberList();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="container max-w-3xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-6 w-6" />
        <h1 className="text-2xl font-bold">開発者ツール</h1>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>メンバー一覧の取得に失敗しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <DevToolsPanel
          members={members!}
          myDiscordId={myDiscordId}
          myName={myName}
        />
      )}
    </div>
  );
}
