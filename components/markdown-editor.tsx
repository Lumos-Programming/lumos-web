"use client"

import { useTheme } from "next-themes"
import dynamic from "next/dynamic"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
}

export function MarkdownEditor({ value, onChange, height = 200, placeholder }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? "")}
        height={height}
        visibleDragbar={false}
        textareaProps={{ placeholder }}
      />
    </div>
  )
}
