"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CalendarSubscription({ calendarUrl }: { calendarUrl: string }) {
  const [copied, setCopied] = useState(false);
  const webcalUrl = calendarUrl.replace(/^https?:/, "webcal:");

  const copyUrl = async () => {
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">カレンダーに追加</p>
          <p className="text-sm text-muted-foreground">
            Lumos のイベント予定を、お使いのカレンダーに自動で同期できます。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm">
            <a href={webcalUrl}>
              <CalendarPlus className="h-4 w-4" />
              カレンダーに登録
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={copyUrl}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "コピーしました" : "URLをコピー"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
