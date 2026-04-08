"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ErrorPage, { type ErrorPageConfig } from "@/components/error-page";

const SHARED = {
  showLumos: true,
  redirectTo: "/",
  redirectSeconds: 10,
} as const;

const ERROR_CONFIGS: Record<string, ErrorPageConfig> = {
  not_found: {
    ...SHARED,
    lines: [
      { text: "Hmm...", delay: 0.3 },
      { text: "This invite", delay: 0.6 },
      { text: "seems to have", delay: 0.9 },
      { text: "wandered off", delay: 1.2 },
    ],
    description:
      "招待リンクが見つかりませんでした。\nWebサイトから新しいリンクを\nリクエストしてください。",
  },
  used: {
    ...SHARED,
    lines: [
      { text: "Oops!", delay: 0.3 },
      { text: "This invite", delay: 0.6 },
      { text: "already had", delay: 0.9 },
      { text: "its moment", delay: 1.2 },
    ],
    description:
      "この招待リンクは既に使用されました。\n必要な場合は新しいリンクを\nリクエストしてください。",
  },
  expired: {
    ...SHARED,
    lines: [
      { text: "Oh no!", delay: 0.3 },
      { text: "This invite's", delay: 0.6 },
      { text: "magic has", delay: 0.9 },
      { text: "faded away", delay: 1.2 },
    ],
    description:
      "有効期限が切れました。\nWebサイトから新しい招待リンクを\nリクエストしてください。",
  },
  already_member: {
    ...SHARED,
    lines: [
      { text: "Wait...", delay: 0.3 },
      { text: "You're already", delay: 0.6 },
      { text: "one of us!", delay: 0.9 },
    ],
    description: "あなたは既に\nLINEグループのメンバーです。",
  },
  not_configured: {
    ...SHARED,
    lines: [
      { text: "Sorry!", delay: 0.3 },
      { text: "We're still", delay: 0.6 },
      { text: "setting things up", delay: 0.9 },
    ],
    description:
      "この機能は現在利用できません。\n管理者にお問い合わせください。",
  },
};

const DEFAULT_CONFIG: ErrorPageConfig = {
  ...SHARED,
  lines: [
    { text: "Oops!", delay: 0.3 },
    { text: "Something went", delay: 0.6 },
    { text: "a little sideways", delay: 0.9 },
  ],
  description: "もう一度お試しください。",
};

function LineInviteErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const config = (reason && ERROR_CONFIGS[reason]) || DEFAULT_CONFIG;

  return <ErrorPage config={config} />;
}

export default function LineInviteErrorPage() {
  return (
    <Suspense>
      <LineInviteErrorContent />
    </Suspense>
  );
}
