"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Switch } from "@/components/ui/switch"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
}

export function MarkdownEditor({ value, onChange, height = 200, placeholder }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="space-y-2">
      <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
        <MDEditor
          value={value}
          onChange={(val) => onChange(val ?? "")}
          height={height}
          preview="edit"
          visibleDragbar={false}
          textareaProps={{ placeholder }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={showPreview}
          onCheckedChange={setShowPreview}
          id="bio-preview-toggle"
        />
        <label htmlFor="bio-preview-toggle" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          プレビュー
        </label>
      </div>
      {showPreview && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 min-h-[80px] animate-[fadeInUp_200ms_ease_both]">
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">まだ何も書かれていません</p>
          )}
        </div>
      )}
    </div>
  )
}
