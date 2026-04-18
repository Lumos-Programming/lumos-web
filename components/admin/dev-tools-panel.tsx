"use client";

import { useState, useTransition } from "react";
import {
  type GuildMemberInfo,
  sendTestDiscordMessage,
  sendTestLineMessage,
} from "@/lib/admin/dev-tools-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";

const MESSAGE_TYPES = [
  {
    value: "welcome",
    label: "ようこそメッセージ",
    description: "初回ログイン時に送信。オンボーディングへの誘導ボタン付き。",
  },
  {
    value: "onboarding_complete",
    label: "オンボーディング完了",
    description:
      "オンボーディング完了時に送信。プロフィール充足率とモック未入力項目を表示。",
  },
  {
    value: "login",
    label: "ログイン通知",
    description: "通常ログイン時に送信。ランダムな挨拶メッセージが選ばれる。",
  },
  {
    value: "welcome_back",
    label: "おかえりメッセージ",
    description:
      "7日以上ぶりのログイン時に送信。プロフィール充足率とモック未入力項目を表示。",
  },
  {
    value: "registration_nudge",
    label: "登録案内",
    description: "Lumos Web未登録のDiscordメンバーに送信。メンバー登録を促す。",
  },
  {
    value: "onboarding_nudge",
    label: "オンボーディング案内",
    description:
      "ログイン済みだがオンボーディング未完了のメンバーに送信。完了を促す。",
  },
  {
    value: "optout_confirm_request",
    label: "退会 最終確認リクエスト",
    description:
      "退会フォーム送信後に送られる、本人確認用の最終確認 DM。20分間有効な「退会処理を完了させる」ボタン付き。",
  },
] as const;

interface DevToolsPanelProps {
  members: GuildMemberInfo[];
  myDiscordId: string;
  myName: string;
}

export function DevToolsPanel({
  members,
  myDiscordId,
  myName,
}: DevToolsPanelProps) {
  return (
    <Tabs defaultValue="discord">
      <TabsList className="mb-4">
        <TabsTrigger value="discord">Discord メッセージ</TabsTrigger>
        <TabsTrigger value="line">LINE メッセージ</TabsTrigger>
      </TabsList>
      <TabsContent value="discord">
        <DiscordTab
          members={members}
          myDiscordId={myDiscordId}
          myName={myName}
        />
      </TabsContent>
      <TabsContent value="line">
        <LineTab />
      </TabsContent>
    </Tabs>
  );
}

// --- Discord Tab ---

function DiscordTab({
  members,
  myDiscordId,
  myName,
}: {
  members: GuildMemberInfo[];
  myDiscordId: string;
  myName: string;
}) {
  const [messageType, setMessageType] = useState<string>("welcome");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
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

  function handleSendToSelf() {
    if (!messageType) return;
    setResult(null);
    startTransition(async () => {
      const res = await sendTestDiscordMessage(messageType, myDiscordId);
      setResult(
        res.success
          ? { type: "success", message: `${myName} に送信しました` }
          : { type: "error", message: res.error ?? "送信に失敗しました" },
      );
    });
  }

  function handleSendToSelected() {
    if (!messageType || selected.size === 0) return;
    setResult(null);
    startTransition(async () => {
      const ids = Array.from(selected);
      let successCount = 0;
      let lastError: string | undefined;

      for (const id of ids) {
        const res = await sendTestDiscordMessage(messageType, id);
        if (res.success) {
          successCount++;
        } else {
          lastError = res.error;
        }
      }

      const failCount = ids.length - successCount;
      if (failCount === 0) {
        setResult({
          type: "success",
          message: `${successCount}件すべて送信しました`,
        });
      } else {
        setResult({
          type: "error",
          message: `${ids.length}件中${successCount}件成功、${failCount}件失敗${lastError ? `: ${lastError}` : ""}`,
        });
      }
      setSelected(new Set());
    });
  }

  const selectedType = MESSAGE_TYPES.find((t) => t.value === messageType);
  const selectedLabel = selectedType?.label ?? "";

  return (
    <div className="space-y-4">
      {result && (
        <Alert variant={result.type === "error" ? "destructive" : "default"}>
          {result.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {result.type === "success" ? "送信完了" : "エラー"}
          </AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">メッセージタイプ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger>
              <SelectValue placeholder="メッセージタイプを選択" />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_TYPES.map((type) => (
                <SelectPrimitive.Item
                  key={type.value}
                  value={type.value}
                  className="relative flex w-full cursor-default select-none items-start rounded-sm py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <span className="absolute left-2 top-2.5 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <div>
                    <SelectPrimitive.ItemText>
                      {type.label}
                    </SelectPrimitive.ItemText>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">
                      {type.description}
                    </div>
                  </div>
                </SelectPrimitive.Item>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSendToSelf}
            disabled={!messageType || isPending}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isPending ? "送信中..." : `自分に送信（${selectedLabel}）`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              メンバー選択送信
              <Badge variant="secondary" className="ml-2">
                {members.length}人
              </Badge>
            </CardTitle>
            <Button
              onClick={handleSendToSelected}
              disabled={selected.size === 0 || !messageType || isPending}
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isPending ? "送信中..." : `送信（${selected.size}件）`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 pb-3 mb-3 border-b">
            <Checkbox
              id="select-all-discord"
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={isPending}
            />
            <label
              htmlFor="select-all-discord"
              className="text-sm font-medium cursor-pointer select-none"
            >
              全選択
            </label>
          </div>

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
                <p className="text-sm font-medium truncate">
                  {member.displayName}
                </p>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- LINE Tab ---

function LineTab() {
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setResult(null);
    startTransition(async () => {
      const res = await sendTestLineMessage();
      setResult(
        res.success
          ? { type: "success", message: "LINE メッセージを送信しました" }
          : { type: "error", message: res.error ?? "送信に失敗しました" },
      );
    });
  }

  return (
    <div className="space-y-4">
      {result && (
        <Alert variant={result.type === "error" ? "destructive" : "default"}>
          {result.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {result.type === "success" ? "送信完了" : "エラー"}
          </AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">LINE テスト送信</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            環境変数{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              LINE_PUSH_TARGET_ID
            </code>{" "}
            に設定されたターゲットに、次回ミニLTイベントのメッセージを送信します。
          </p>
          <Button onClick={handleSend} disabled={isPending} className="w-full">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {isPending ? "送信中..." : "テスト送信"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
