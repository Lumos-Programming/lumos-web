import Link from "next/link";
import { isProduction } from "@/lib/env";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  CalendarClock,
  Newspaper,
  Shield,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

const ADMIN_ACTIONS = [
  {
    href: "/internal/admin/members",
    icon: Users,
    label: "メンバー管理",
    description: "登録メンバーの確認・編集を行います",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    href: "/internal/admin/news",
    icon: Newspaper,
    label: "お知らせ管理",
    description: "Lumos公式のお知らせを作成・公開します",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    href: "/internal/admin/notifications",
    icon: Bell,
    label: "登録案内通知",
    description: "未登録メンバーへDiscord DMを送信します",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    href: "/internal/admin/role-sync",
    icon: ShieldCheck,
    label: "Discordロール同期/付与",
    description: "登録情報をもとにロールを一括同期します",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    href: "/internal/admin/role-assignment",
    icon: CalendarClock,
    label: "参加日時によるロール付与",
    description: "参加日時を指定して対象者にロールを付与します",
    gradient: "from-purple-500 to-indigo-500",
  },
  ...(!isProduction()
    ? [
        {
          href: "/internal/admin/dev-tools",
          icon: Wrench,
          label: "開発者ツール",
          description: "開発環境用の管理・検証ツールを開きます",
          gradient: "from-slate-500 to-zinc-600",
        },
      ]
    : []),
];

export default async function AdminPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 md:p-8 text-white animate-spring-up">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-soft-pulse" />
        <div className="relative z-10 flex items-center gap-3">
          <Shield className="h-7 w-7" />
          <div>
            <p className="text-white/70 text-sm font-medium">
              Lumos 管理ツール
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">
              管理者ポータル
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ADMIN_ACTIONS.map(
          ({ href, icon: Icon, label, description, gradient }, index) => (
            <Link
              key={href}
              href={href}
              className={`stagger-tight-${index + 2} animate-spring-up fill-mode-backwards`}
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
  );
}
