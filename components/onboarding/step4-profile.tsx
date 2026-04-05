"use client"

import type {Dispatch, SetStateAction} from "react"
import {MarkdownEditor} from "@/components/markdown-editor"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Star} from "lucide-react"
import {InterestTagInput} from "@/components/interest-tag-input"
import type {FormData} from "./types"
import {MAX_TOP_INTERESTS} from "@/types/interests";

interface Step4ProfileProps {
  form: FormData
  setForm: Dispatch<SetStateAction<FormData>>
  submitting: boolean
  onNext: () => void
  onBack: () => void
}

export function Step4Profile({form, setForm, submitting, onNext, onBack}: Step4ProfileProps) {
  return (
    <div className="p-8">
      <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
        <h2
          className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">プロフィール</h2>
        <p className="text-muted-foreground mt-1 text-sm">興味分野とプロフィール文を設定しましょう。</p>
      </div>

      <div className="space-y-6 animate-[fadeInUp_300ms_60ms_ease_both]">
        {/* 興味分野 */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">興味分野</Label>
          <p className="text-xs text-muted-foreground">興味のある分野や技術をタグとして登録できます。</p>
          <div
            className="flex items-start gap-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 px-3 py-2">
            <Star className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0"
                  fill="currentColor"/>
            <p
              className="text-xs text-purple-700 dark:text-purple-300">最大{MAX_TOP_INTERESTS}つまでメンバー一覧に表示できます。タグをタップして入れ替えできます。</p>
          </div>
          <InterestTagInput
            value={form.interests}
            onChange={(tags) => setForm((f) => ({...f, interests: tags}))}
            topInterests={form.topInterests}
            onTopInterestsChange={(top) => setForm((f) => ({...f, topInterests: top}))}
          />
        </div>

        {/* プロフィール文 */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">プロフィール文</Label>
          <MarkdownEditor
            value={form.bio}
            onChange={(val) => setForm((f) => ({...f, bio: val}))}
            height={300}
            placeholder={"経営学部3年の山田です！\n\n**趣味**\n- カラオケ 🎤（ヒトカラも全然いく派）\n- 筋トレ 💪（最近ベンチプレス60kg達成しました）\n- Netflix（おすすめあったら教えてください！）\n\n最近友達とWeb開発や機械学習の勉強を始めました！いろいろ作ってみたいです、よろしくお願いします！"}
          />
        </div>

        <div
          className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
               viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300">プロフィール設定からいつでも編集できます!</p>
        </div>
      </div>

      <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onNext} disabled={submitting}
                className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
          {submitting ? "保存中..." : "次へ →"}
        </Button>
      </div>
    </div>
  )
}
