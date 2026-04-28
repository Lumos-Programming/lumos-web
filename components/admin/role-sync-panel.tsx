"use client";

import { useState, useTransition } from "react";
import {
  type SyncRolesResult,
  syncAllMemberDiscordRoles,
} from "@/lib/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export function RoleSyncPanel() {
  const [result, setResult] = useState<SyncRolesResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const res = await syncAllMemberDiscordRoles();
      setResult(res);
    });
  }

  return (
    <div className="space-y-4">
      {result && (
        <>
          <Alert variant={result.failed > 0 ? "destructive" : "default"}>
            {result.failed > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertTitle>ロール付与結果</AlertTitle>
            <AlertDescription>
              {result.total}件中 {result.success}件成功
              {result.failed > 0 && `、${result.failed}件失敗`}
            </AlertDescription>
          </Alert>

          <div className="rounded-md border text-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">メンバー</th>
                  <th className="px-3 py-2 font-medium">付与したロールID</th>
                  <th className="px-3 py-2 font-medium">エラー</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map((d) => (
                  <tr
                    key={d.discordId}
                    className={
                      d.errors.length > 0
                        ? "border-b bg-destructive/10"
                        : "border-b"
                    }
                  >
                    <td className="px-3 py-2">
                      <div>{d.discordUsername}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.discordId}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {d.addedRoleIds.length > 0 ? (
                        <ul className="space-y-0.5">
                          {d.addedRoleIds.map((id) => (
                            <li key={id} className="font-mono text-xs">
                              {id}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">なし</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {d.errors.length > 0 ? (
                        <ul className="space-y-0.5 text-destructive">
                          {d.errors.map((e, i) => (
                            <li key={i} className="text-xs">
                              {e}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Discordロール一括付与
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            登録済みメンバー全員に Discord ロールを付与します。
            メンバー種別・学年・学部・興味分野は Discord
            サーバーのロール名とプロフィール値を自動マッチングします。
            年度メンバーロール（全員共通）は環境変数
            <code className="text-xs bg-muted px-1 rounded">
              MEMBER_ROLE_ID
            </code>
            で指定してください。
          </p>
          <Button onClick={handleSync} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isPending ? "付与中..." : "全メンバーにロールを付与"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
