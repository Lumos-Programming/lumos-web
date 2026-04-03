"use client"

import type {Dispatch, SetStateAction} from "react"
import {Button} from "@/components/ui/button"
import {VisibilityToggle} from "@/components/ui/visibility-toggle"
import type {FormData, VisibilityForm} from "./types"
import {DEFAULT_VISIBILITY, VISIBILITY_LABELS, VISIBILITY_DISPLAY_KEYS} from "./types"

interface Step5VisibilityProps {
  form: FormData
  allowPublic: boolean
  setAllowPublic: Dispatch<SetStateAction<boolean>>
  visibility: VisibilityForm
  setVisibility: Dispatch<SetStateAction<VisibilityForm>>
  submitting: boolean
  onNext: () => void
  onBack: () => void
}

export function Step5Visibility({form, allowPublic, setAllowPublic, visibility, setVisibility, submitting, onNext, onBack}: Step5VisibilityProps) {
  return (
    <div className="p-8">
      <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">公開設定</h2>
        <p className="text-muted-foreground mt-1 text-sm">各情報を誰に公開するか設定してください。</p>
      </div>

      <div className="space-y-4 animate-[fadeInUp_300ms_60ms_ease_both]">
        {/* 公開レベルの説明 */}
        <div
          className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span
              className="inline-block px-1.5 py-0.5 rounded-full bg-gray-500 text-white font-medium flex-shrink-0">非公開</span>
            <span>自分だけが閲覧できます。他のメンバーにも表示されません。</span>
          </div>
          <div className="flex items-start gap-2">
            <span
              className="inline-block px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-medium flex-shrink-0">内部のみ</span>
            <span>Lumosメンバーだけが閲覧できます。外部向けHPには表示されません。</span>
          </div>
          <div className="flex items-start gap-2">
            <span
              className="inline-block px-1.5 py-0.5 rounded-full bg-green-600 text-white font-medium flex-shrink-0">外部公開</span>
            <span>LumosのHP（公開サイト）にも表示されます。誰でも閲覧できます。</span>
          </div>
        </div>

        {/* HP掲載トグル */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            const next = !allowPublic
            setAllowPublic(next)
            if (next) {
              setVisibility(DEFAULT_VISIBILITY)
            } else {
              setVisibility((prev) => {
                const clamped = {...prev} as VisibilityForm
                for (const k of VISIBILITY_DISPLAY_KEYS) {
                  if (clamped[k] === "public") clamped[k] = "internal"
                }
                return clamped
              })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.currentTarget.click()
          }}
          className={[
            "w-full flex items-center justify-between gap-3 rounded-xl border-2 px-3 sm:px-4 py-3 transition-all duration-200 cursor-pointer select-none",
            allowPublic
              ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50",
          ].join(" ")}
        >
          <div className="min-w-0">
            <p className={["font-semibold text-sm", allowPublic ? "text-green-800 dark:text-green-300" : "text-gray-700 dark:text-gray-300"].join(" ")}>
              HPにメンバー情報を掲載する
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allowPublic ? "Lumosメンバーとして公式HPにメンバー情報を掲載できます" : "公式HPにメンバー情報を掲載しません"}
            </p>
          </div>
          <div className={[
            "w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 relative",
            allowPublic ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-gray-300 dark:bg-gray-600",
          ].join(" ")}>
            <span className={[
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
              allowPublic ? "translate-x-5" : "translate-x-0.5",
            ].join(" ")}/>
          </div>
        </div>

        {/* フィールド別設定 */}
        <div className="space-y-1">
          <div className="flex justify-end gap-6 text-xs text-gray-400 dark:text-gray-500 pr-1">
            <span>非公開</span>
            <span>内部のみ</span>
            <span className={allowPublic ? "" : "opacity-30"}>外部公開</span>
          </div>
          {VISIBILITY_DISPLAY_KEYS.map((key) => {
            if (key === "currentOrg" && form.memberType !== "卒業生") return null
            return (
              <div key={key}
                   className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 shrink-1">
                  {VISIBILITY_LABELS[key]}
                </span>
                <VisibilityToggle
                  value={visibility[key]}
                  onChange={(v) => setVisibility((prev) => ({...prev, [key]: v}))}
                  max={key === "line" || key === "birthDate" || !allowPublic ? "internal" : undefined}
                  min={key === "line" || key === "discord" ? "internal" : undefined}
                />
              </div>
            )
          })}
        </div>
        <div
          className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
               viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300">公開設定はあとでプロフィール設定から変更できます。</p>
        </div>
      </div>

      <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onNext} disabled={submitting}
                className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
          次へ →
        </Button>
      </div>
    </div>
  )
}
