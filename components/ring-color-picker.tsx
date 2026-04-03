"use client"

import { RING_COLORS } from "@/types/member"
import type { RingColorKey } from "@/types/member"

interface RingColorPickerProps {
  value: RingColorKey
  onChange: (color: RingColorKey) => void
  description?: string
}

export function RingColorPicker({ value, onChange, description }: RingColorPickerProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">リングカラー</span>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {RING_COLORS.map((color) => (
          <button
            key={color.key}
            type="button"
            onClick={() => onChange(color.key)}
            className={`w-8 h-8 rounded-full ${color.bg} transition-all duration-200 ${value === color.key ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white" : "hover:scale-110"}`}
            title={color.label}
          />
        ))}
      </div>
    </div>
  )
}
