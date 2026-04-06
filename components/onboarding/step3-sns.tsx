/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
"use client";

import { Button } from "@/components/ui/button";
import { LineIcon, GithubIcon, XIcon, LinkedInIcon } from "./types";

interface Step3SnsProps {
  lineLinked: boolean;
  lineUsername: string;
  lineAvatar: string;
  githubLinked: boolean;
  githubUsername: string;
  githubAvatar: string;
  xLinked: boolean;
  xUsername: string;
  xAvatar: string;
  linkedinUrl: string;
  onLinkedinUrlChange: (url: string) => void;
  linkedinError: string;
  onLinkedinBlur: () => void;
  step3Error: string;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Sns({
  lineLinked,
  lineUsername,
  lineAvatar,
  githubLinked,
  githubUsername,
  githubAvatar,
  xLinked,
  xUsername,
  xAvatar,
  linkedinUrl,
  onLinkedinUrlChange,
  linkedinError,
  onLinkedinBlur,
  step3Error,
  onNext,
  onBack,
}: Step3SnsProps) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
          SNSアカウントを連携
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          LINEの連携は必須です。GitHubとXは任意です。
        </p>
      </div>

      <div className="space-y-3">
        {/* LINE — required */}
        <div
          className={[
            "rounded-xl border p-4 transition-all duration-300",
            lineLinked
              ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
              : "border-gray-200 dark:border-gray-700",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center w-14 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center">
                  <LineIcon className="w-5 h-5 text-white" />
                </div>
                {lineLinked && lineAvatar && (
                  <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                    <img
                      src={lineAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    LINE
                  </span>
                  <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
                    必須
                  </span>
                </div>
                {lineLinked && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">
                    @{lineUsername}
                  </p>
                )}
              </div>
            </div>
            <a
              href="/api/auth/link/line?redirectTo=/internal/onboarding%3Fstep%3D3"
              className={[
                "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                lineLinked
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  : "bg-[#06C755] hover:bg-[#05a848] text-white",
              ].join(" ")}
            >
              <LineIcon className="w-3.5 h-3.5" />
              {lineLinked ? "再連携" : "連携する"}
            </a>
          </div>
        </div>

        {/* GitHub — optional */}
        <div
          className={[
            "rounded-xl border p-4 transition-all duration-300",
            githubLinked
              ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
              : "border-gray-200 dark:border-gray-700",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center w-14 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
                  <GithubIcon className="w-4 h-4 text-white dark:text-gray-900" />
                </div>
                {githubLinked && githubAvatar && (
                  <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                    <img
                      src={githubAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  GitHub
                </span>
                {githubLinked && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">
                    @{githubUsername}
                  </p>
                )}
              </div>
            </div>
            <a
              href="/api/auth/link/github?redirectTo=/internal/onboarding%3Fstep%3D3"
              className={[
                "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                githubLinked
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  : "bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 dark:text-gray-900 text-white",
              ].join(" ")}
            >
              <GithubIcon className="w-3.5 h-3.5" />
              {githubLinked ? "再連携" : "連携する"}
            </a>
          </div>
        </div>

        {/* X — optional */}
        <div
          className={[
            "rounded-xl border p-4 transition-all duration-300",
            xLinked
              ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
              : "border-gray-200 dark:border-gray-700",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center w-14 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                  <XIcon className="w-4 h-4 text-white" />
                </div>
                {xLinked && xAvatar && (
                  <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                    <img
                      src={xAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  X
                </span>
                {xLinked && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">
                    @{xUsername}
                  </p>
                )}
              </div>
            </div>
            <a
              href="/api/auth/link/x?redirectTo=/internal/onboarding%3Fstep%3D3"
              className={[
                "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                xLinked
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  : "bg-black hover:bg-gray-800 text-white",
              ].join(" ")}
            >
              <XIcon className="w-3.5 h-3.5" />
              {xLinked ? "再連携" : "連携する"}
            </a>
          </div>
        </div>

        {/* LinkedIn — optional (URL手動入力) */}
        <div
          className={[
            "rounded-xl border p-4 transition-all duration-300",
            linkedinUrl
              ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
              : "border-gray-200 dark:border-gray-700",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
              <LinkedInIcon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                LinkedIn
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                LinkedIn プロフィールURL（任意）
              </p>
            </div>
          </div>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => onLinkedinUrlChange(e.target.value)}
            onBlur={onLinkedinBlur}
            placeholder="https://linkedin.com/in/username"
            className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${linkedinError ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-gray-700 focus:ring-[#0A66C2]/50 focus:border-[#0A66C2]"}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            <a
              href="https://www.linkedin.com/in/me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0A66C2] hover:underline"
            >
              こちら
            </a>
            で表示されるページのURLを入力してください
          </p>
          {linkedinError && (
            <p className="text-xs text-red-500 mt-1">{linkedinError}</p>
          )}
        </div>

        {step3Error && (
          <p className="text-sm text-red-500 animate-[fadeInUp_300ms_ease_both]">
            {step3Error}
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        <Button
          onClick={onNext}
          className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30"
        >
          次へ →
        </Button>
      </div>
    </div>
  );
}
