"use client";

import { useState, useTransition } from "react";
import {
  type RoleAssignmentCandidate,
  type RoleAssignmentResult,
  previewRoleAssignment,
  assignRoleByJoinDate,
} from "@/lib/admin/role-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, Search, Send } from "lucide-react";

type Props = {
  defaultRoleId?: string;
  /** "YYYY-MM-DDTHH:mm" string already converted to the desired display
   *  timezone (e.g. JST). Server Component is responsible for the conversion
   *  to avoid SSR/CSR hydration mismatches. */
  defaultJoinedAfterLocal?: string;
};

export function RoleAssignmentPanel({
  defaultRoleId = "",
  defaultJoinedAfterLocal = "",
}: Props = {}) {
  const [roleId, setRoleId] = useState(defaultRoleId);
  const [joinedAfter, setJoinedAfter] = useState(defaultJoinedAfterLocal);
  const [candidates, setCandidates] = useState<
    RoleAssignmentCandidate[] | null
  >(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoleAssignmentResult | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isAssigning, startAssign] = useTransition();

  const isPending = isPreviewing || isAssigning;
  const allSelected =
    candidates !== null &&
    candidates.length > 0 &&
    selected.size === candidates.length;

  function handlePreview() {
    setError(null);
    setResult(null);
    setCandidates(null);
    setSelected(new Set());
    startPreview(async () => {
      try {
        const datetimeIso = toIsoFromLocal(joinedAfter);
        const list = await previewRoleAssignment(roleId.trim(), datetimeIso);
        setCandidates(list);
        setSelected(new Set(list.map((c) => c.discordId)));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleAssign() {
    if (!candidates || selected.size === 0) return;
    if (!confirm(`${selected.size}人にロールを付与します。よろしいですか？`)) {
      return;
    }
    setError(null);
    setResult(null);
    startAssign(async () => {
      try {
        const datetimeIso = toIsoFromLocal(joinedAfter);
        const res = await assignRoleByJoinDate(
          roleId.trim(),
          datetimeIso,
          Array.from(selected),
        );
        setResult(res);
        // re-preview to refresh state
        const list = await previewRoleAssignment(roleId.trim(), datetimeIso);
        setCandidates(list);
        setSelected(new Set(list.map((c) => c.discordId)));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function toggleAll() {
    if (!candidates) return;
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.discordId)));
    }
  }

  function toggleMember(discordId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(discordId)) next.delete(discordId);
      else next.add(discordId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">条件指定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-id">ロールID</Label>
            <Input
              id="role-id"
              type="text"
              inputMode="numeric"
              placeholder="例: 1501185602756808804"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Discordロール設定画面でロールを右クリック →
              「IDをコピー」（開発者モード必須）
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joined-after">この日時以降に参加したメンバー</Label>
            <Input
              id="joined-after"
              type="datetime-local"
              value={joinedAfter}
              onChange={(e) => setJoinedAfter(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              現在のタイムゾーンで指定します
            </p>
          </div>

          <Button
            onClick={handlePreview}
            disabled={!roleId.trim() || !joinedAfter || isPending}
          >
            {isPreviewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isPreviewing ? "検索中..." : "対象メンバーを検索"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert variant={result.failed > 0 ? "destructive" : "default"}>
          {result.failed > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>付与結果</AlertTitle>
          <AlertDescription>
            <p>
              {result.total}件中 {result.success}件成功
              {result.failed > 0 && `、${result.failed}件失敗`}
            </p>
            {result.failures.length > 0 && (
              <ul className="mt-2 text-sm space-y-1">
                {result.failures.map((f) => (
                  <li key={f.discordId}>
                    {f.username}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {candidates !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                対象メンバー
                <Badge variant="secondary" className="ml-2">
                  {candidates.length}人
                </Badge>
              </CardTitle>
              <Button
                onClick={handleAssign}
                disabled={selected.size === 0 || isPending}
                size="sm"
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isAssigning
                  ? "付与中..."
                  : `ロールを付与（${selected.size}件）`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                条件に一致するメンバーはいません
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 pb-3 mb-3 border-b">
                  <Checkbox
                    id="select-all-roles"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    disabled={isPending}
                  />
                  <label
                    htmlFor="select-all-roles"
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    全選択
                  </label>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {candidates.map((c) => (
                    <label
                      key={c.discordId}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selected.has(c.discordId)}
                        onCheckedChange={() => toggleMember(c.discordId)}
                        disabled={isPending}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={c.avatarUrl ?? undefined}
                          alt={c.displayName}
                        />
                        <AvatarFallback className="text-xs">
                          {c.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {c.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{c.username} ・ 参加日:{" "}
                          {new Date(c.joinedAt).toLocaleString("ja-JP")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * `<input type="datetime-local">` returns a string like "2026-05-06T00:00"
 * with no timezone offset; the browser interprets this as local time. Convert
 * to a real ISO string via Date so the server receives an unambiguous instant.
 */
function toIsoFromLocal(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}
