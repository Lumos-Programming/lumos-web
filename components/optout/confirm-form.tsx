"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  EyeOff,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "busy", label: "忙しくなった・時間が取れない" },
  { value: "interest_changed", label: "興味・目標が変わった" },
  { value: "atmosphere", label: "活動の雰囲気が合わなかった" },
  { value: "content", label: "活動内容が合わなかった" },
  { value: "graduated", label: "卒業・進路変更のため" },
  { value: "other", label: "その他" },
];

const REASON_DETAIL_MAX = 1000;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "redirecting" }
  | { status: "error"; message: string };

type Notice = {
  title: string;
  body: string;
};

export default function OptoutConfirmForm({
  discordId,
  sig,
  displayName,
  notice,
}: {
  discordId: string;
  sig: string;
  displayName: string;
  notice?: Notice;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const [showMissingReasons, setShowMissingReasons] = useState(false);

  const missingReasons: string[] = [];
  if (!reason) missingReasons.push("「継続しない主な理由」を選択してください");
  if (!checked)
    missingReasons.push("下部のチェックボックスをオンにしてください");

  const canSubmit = missingReasons.length === 0 && !isPending;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) {
      setShowMissingReasons(true);
      return;
    }
    setShowMissingReasons(false);

    startTransition(async () => {
      setState({ status: "submitting" });
      try {
        const res = await fetch("/api/optout/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discordId,
            sig,
            survey: {
              reason,
              ...(reasonDetail.trim()
                ? { reasonDetail: reasonDetail.trim() }
                : {}),
            },
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          success?: boolean;
          alreadyRecorded?: boolean;
        };
        if (!res.ok) {
          setState({
            status: "error",
            message:
              data.error ??
              `送信に失敗しました (${res.status})。お手数ですが管理者にご連絡ください。`,
          });
          return;
        }
        setState({ status: "redirecting" });
        // 成功後は専用ページへ遷移 (既に受付済みの場合は完了ページへ)
        router.replace(
          data.alreadyRecorded ? "/optout/done" : "/optout/submitted",
        );
      } catch {
        setState({
          status: "error",
          message:
            "通信に失敗しました。ネットワーク状況をご確認のうえ再度お試しください。",
        });
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-[#e8eaf6] shadow-xl backdrop-blur-sm"
      >
        <h1 className="text-2xl font-bold">退会の確認</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#c8cae0]">
          <span className="font-semibold text-white">{displayName}</span>{" "}
          さんのLumosの退会手続きを受け付けます。
        </p>

        {notice && (
          <div className="mt-4 rounded-lg border border-sky-400/30 bg-sky-400/[0.06] p-4 text-sm">
            <div className="flex items-center gap-2">
              <Info
                aria-hidden
                className="h-5 w-5 flex-shrink-0 text-sky-300"
              />
              <p className="font-semibold text-sky-200">{notice.title}</p>
            </div>
            <p className="mt-2 leading-relaxed text-[#c8cae0]">{notice.body}</p>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
          <div className="flex items-center gap-2">
            <EyeOff
              aria-hidden
              className="h-5 w-5 flex-shrink-0 text-[#c8cae0]"
            />
            <p className="font-semibold text-white">退会後のアクセスについて</p>
          </div>
          <p className="mt-2 leading-relaxed text-[#c8cae0]">
            Discordサーバーには引き続き参加いただけますが、
            <span className="font-medium text-white">
              メンバー用チャンネルは閲覧できなくなります
            </span>
            。
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/[0.08] p-4 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles
              aria-hidden
              className="h-5 w-5 flex-shrink-0 text-amber-300"
            />
            <p className="font-semibold text-amber-200">
              再加入も是非ご検討ください
            </p>
          </div>
          <p className="mt-2 leading-relaxed text-[#f1e8c7]">
            <span className="font-medium text-white">
              Lumosは一年中入会を受け付けています。
            </span>
            <br />
            再加入をご希望の場合は、ポータルサイトにログインして再加入申請お願いします。
          </p>
        </div>

        {/* --- アンケート --- */}
        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="optout-reason"
              className="text-sm font-semibold text-white"
            >
              継続しない主な理由 <span className="text-rose-300">*</span>
            </label>
            <select
              id="optout-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              className="mt-2 w-full rounded-md border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none disabled:opacity-50"
            >
              <option value="" disabled className="bg-[#0d0f1a]">
                選択してください
              </option>
              {REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0d0f1a]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="optout-reason-detail"
              className="text-sm font-semibold text-white"
            >
              もしよろしければ、理由を詳しく教えてください（任意）
            </label>
            <textarea
              id="optout-reason-detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              disabled={isPending}
              rows={3}
              maxLength={REASON_DETAIL_MAX}
              placeholder="運営改善の参考にさせていただきます"
              className="mt-2 w-full rounded-md border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-[#6b6f88] focus:border-white/40 focus:outline-none disabled:opacity-50"
            />
            <p className="mt-1 text-right text-xs text-[#8b8fa8]">
              {reasonDetail.length} / {REASON_DETAIL_MAX}
            </p>
          </div>
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm text-[#c8cae0] cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={isPending}
          />
          <span>
            上記の内容を理解したうえで、
            <strong className="text-white">継続しない</strong>
            ことを確認しました。
          </span>
        </label>

        {state.status === "error" && (
          <p className="mt-4 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          aria-disabled={!canSubmit}
          onClick={() => {
            if (!canSubmit && !isPending) setShowMissingReasons(true);
          }}
          className={`mt-6 inline-flex w-full items-center justify-center rounded-md bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-500/90 ${
            canSubmit ? "" : "opacity-50"
          } ${isPending ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isPending ? "最終確認DMを送信中..." : "退会手続きを進める"}
        </button>

        {showMissingReasons && missingReasons.length > 0 && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <TriangleAlert
                aria-hidden
                className="h-5 w-5 flex-shrink-0 text-rose-300"
              />
              <p className="font-semibold text-rose-200">
                未入力の項目があります
              </p>
            </div>
            <ul className="mt-2 space-y-1 list-disc pl-5 text-[#f3cfd4]">
              {missingReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-sky-400/30 bg-sky-400/[0.06] p-4 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck
              aria-hidden
              className="h-5 w-5 flex-shrink-0 text-sky-300"
            />
            <p className="font-semibold text-sky-200">
              Discordに最終確認メッセージを送信します
            </p>
          </div>
          <p className="mt-2 leading-relaxed text-[#c8cae0]">
            Discordアカウント宛に退会の最終確認のDMを送信します。ご確認ください。
          </p>
        </div>
      </form>
    </div>
  );
}
