"use client";

import { useState, useTransition } from "react";
import {
  type UnregisteredMember,
  type SendResult,
  sendRegistrationNudge,
} from "@/lib/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface AdminNotificationPanelProps {
  members: UnregisteredMember[];
}

export function AdminNotificationPanel({
  members,
}: AdminNotificationPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<SendResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = members.length > 0 && selected.size === members.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(members.map((m) => m.discordId)));
    }
  }

  function toggleMember(discordId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(discordId)) {
        next.delete(discordId);
      } else {
        next.add(discordId);
      }
      return next;
    });
  }

  function handleSend() {
    if (selected.size === 0) return;
    setResult(null);
    startTransition(async () => {
      const res = await sendRegistrationNudge(Array.from(selected));
      setResult(res);
      setSelected(new Set());
    });
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium">
              すべてのメンバーが登録済みです！
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {result && (
        <Alert variant={result.failed > 0 ? "destructive" : "default"}>
          {result.failed > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>送信結果</AlertTitle>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              未登録メンバー
              <Badge variant="secondary" className="ml-2">
                {members.length}人
              </Badge>
            </CardTitle>
            <Button
              onClick={handleSend}
              disabled={selected.size === 0 || isPending}
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isPending ? "送信中..." : `通知を送信（${selected.size}件）`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Select all */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={isPending}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer select-none"
            >
              全選択
            </label>
          </div>

          {/* Member list */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {members.map((member) => (
              <label
                key={member.discordId}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.has(member.discordId)}
                  onCheckedChange={() => toggleMember(member.discordId)}
                  disabled={isPending}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={member.avatarUrl ?? undefined}
                    alt={member.displayName}
                  />
                  <AvatarFallback className="text-xs">
                    {member.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{member.username}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
