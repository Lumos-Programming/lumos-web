"use client"

import type { VisibilityLevel } from "@/types/profile"

const LEVELS: { value: VisibilityLevel; label: string }[] = [
  { value: "private", label: "非公開" },
  { value: "internal", label: "内部のみ" },
  { value: "public", label: "外部公開" },
]

const ACTIVE_STYLES: Record<VisibilityLevel, string> = {
  private: "bg-gray-500 text-white",
  internal: "bg-indigo-600 text-white",
  public: "bg-green-600 text-white",
}

interface VisibilityToggleProps {
  value: VisibilityLevel
  onChange: (v: VisibilityLevel) => void
  max?: "internal" | "none"
  min?: "internal"
}

export function VisibilityToggle({ value, onChange, max, min }: VisibilityToggleProps) {
  return (
    <div className="flex rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5 shrink-0">
      {LEVELS.map(({ value: level, label }) => {
        const isDisabled =
          ((max === "internal" || max === "none") && level === "public") ||
          (min === "internal" && level === "private")
        const isActive = value === level
        return (
          <button
            key={level}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(level)}
            className={[
              "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
              isActive
                ? ACTIVE_STYLES[level]
                : isDisabled
                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            ].join(" ")}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
