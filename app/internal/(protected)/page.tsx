import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMember } from "@/lib/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  CalendarDays,
  Pencil,
  Share2,
  Check,
  Circle,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    href: "/internal/profile/edit",
    icon: Pencil,
    label: "プロフィール編集",
    description: "自己紹介や興味タグを更新",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    href: "/internal/members",
    icon: Users,
    label: "メンバー一覧",
    description: "サークルメンバーを見る",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    href: "/internal/events",
    icon: CalendarDays,
    label: "イベント",
    description: "開催済み・予定イベント",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    href: "/internal/settings",
    icon: Share2,
    label: "SNS連携",
    description: "SNSアカウントを連携",
    gradient: "from-pink-500 to-rose-500",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

interface CompletionItem {
  label: string;
  done: boolean;
}

function getProfileCompletionItems(
  member: Record<string, unknown> | null,
): CompletionItem[] {
  if (!member) return [];
  return [
    { label: "ニックネーム", done: !!member.nickname },
    { label: "氏名", done: !!member.lastName },
    { label: "プロフィール文", done: !!member.bio },
    { label: "プロフィール顔写真", done: !!member.faceImage },
    { label: "SNS連携", done: !!member.github || !!member.x || !!member.line },
    {
      label: "興味分野",
      done: !!(member.interests && (member.interests as string[]).length > 0),
    },
  ];
}

export default async function InternalPage() {
  const session = await auth();
  const member = await getMember(session!.user!.id);
  const displayName = member?.nickname || session?.user?.name || "メンバー";
  const items = getProfileCompletionItems(
    member as Record<string, unknown> | null,
  );
  const completion =
    items.length > 0
      ? Math.round((items.filter((i) => i.done).length / items.length) * 100)
      : 0;
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 md:p-8 text-white animate-spring-up">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-soft-pulse" />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-soft-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium">{today}</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">
            {getGreeting()}、{displayName}さん
          </h1>
          <p className="text-white/70 mt-2 text-sm">
            Lumos メンバー専用ポータル
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Completion — takes 1 col on lg */}
        <Card className="lg:col-span-1 animate-spring-up stagger-tight-2 fill-mode-backwards">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                プロフィール完成度
              </CardTitle>
              <span className="text-2xl font-bold text-foreground">
                {completion}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={completion} className="h-2" />
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-sm"
                >
                  {item.done ? (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 shrink-0">
                      <Check
                        className="w-2.5 h-2.5 text-white"
                        strokeWidth={3}
                      />
                    </span>
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span
                    className={
                      item.done
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {completion < 100 && (
              <Link
                href="/internal/profile/edit"
                className="inline-block text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1"
              >
                プロフィールを編集 →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions — takes 2 cols on lg */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(
            ({ href, icon: Icon, label, description, gradient }, i) => (
              <Link
                key={href}
                href={href}
                className={`stagger-tight-${i + 3} animate-spring-up fill-mode-backwards`}
              >
                <Card className="h-full hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 cursor-pointer group border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div
                      className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shrink-0 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg transition-all duration-300`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                        {label}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
