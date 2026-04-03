"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { X, Star, Plus, Check } from "lucide-react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  INTEREST_TAGS,
  MAX_TAGS,
  MAX_TOP_INTERESTS,
  isValidTag,
  TAG_MAX_LENGTH,
} from "@/types/interests"

interface InterestTagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  topInterests: string[]
  onTopInterestsChange: (top: string[]) => void
  maxTags?: number
}

export function InterestTagInput({
  value,
  onChange,
  topInterests,
  onTopInterestsChange,
  maxTags = MAX_TAGS,
}: InterestTagInputProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selected = useMemo(() => new Set(value), [value])

  const toggleTag = useCallback(
    (tag: string) => {
      if (selected.has(tag)) {
        onChange(value.filter((t) => t !== tag))
        if (topInterests.includes(tag)) {
          onTopInterestsChange(topInterests.filter((t) => t !== tag))
        }
      } else {
        if (value.length >= maxTags) return
        onChange([...value, tag])
      }
    },
    [value, onChange, topInterests, onTopInterestsChange, maxTags, selected]
  )

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag))
      if (topInterests.includes(tag)) {
        onTopInterestsChange(topInterests.filter((t) => t !== tag))
      }
    },
    [value, onChange, topInterests, onTopInterestsChange]
  )

  const toggleTop = useCallback(
    (tag: string) => {
      if (topInterests.includes(tag)) {
        onTopInterestsChange(topInterests.filter((t) => t !== tag))
      } else {
        if (topInterests.length >= MAX_TOP_INTERESTS) return
        onTopInterestsChange([...topInterests, tag])
      }
    },
    [topInterests, onTopInterestsChange]
  )

  const canAddCustom =
    search.trim().length > 0 &&
    !selected.has(search.trim()) &&
    isValidTag(search.trim()) &&
    value.length < maxTags

  // Check if search matches any preset
  const searchTrimmed = search.trim().toLowerCase()
  const hasExactPresetMatch = INTEREST_TAGS.some((cat) =>
    cat.tags.some((t) => t.toLowerCase() === searchTrimmed)
  )
  const hasExactSelectedMatch = value.some(
    (t) => t.toLowerCase() === searchTrimmed
  )

  const showCustomAdd =
    canAddCustom && !hasExactPresetMatch && !hasExactSelectedMatch

  return (
    <div className="space-y-3">
      {/* Selected tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => {
            const isTop = topInterests.includes(tag)
            return (
              <span
                key={tag}
                className={[
                  "inline-flex items-center gap-1 text-xs font-medium pl-2.5 pr-1 py-1 rounded-full transition-all duration-200",
                  isTop
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => toggleTop(tag)}
                  disabled={!isTop && topInterests.length >= MAX_TOP_INTERESTS}
                  className={[
                    "flex-shrink-0 transition-colors",
                    isTop
                      ? "text-purple-500 dark:text-purple-400"
                      : topInterests.length >= MAX_TOP_INTERESTS
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-400 dark:text-gray-500 hover:text-purple-500 dark:hover:text-purple-400",
                  ].join(" ")}
                  title={isTop ? "Top 3から外す" : "Top 3に追加"}
                >
                  <Star
                    className="w-3 h-3"
                    fill={isTop ? "currentColor" : "none"}
                  />
                </button>
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="flex-shrink-0 ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Top 3 hint */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <Star className="w-3 h-3 inline -mt-0.5 mr-0.5" />
          をクリックしてTop 3を選択すると、メンバー一覧のタイルに表示されます
          （{topInterests.length}/{MAX_TOP_INTERESTS}）
        </p>
      )}

      {/* Tag selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={[
              "w-full flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm",
              "bg-white dark:bg-gray-800 text-left",
              "hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
              value.length >= maxTags
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer",
            ].join(" ")}
            disabled={value.length >= maxTags}
          >
            <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {value.length >= maxTags
                ? `最大${maxTags}個まで`
                : "興味分野を検索・追加..."}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {value.length}/{maxTags}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
        >
          <Command shouldFilter={true}>
            <CommandInput
              placeholder="タグを検索..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {search.trim() && !isValidTag(search.trim()) ? (
                  <span className="text-xs text-red-500">
                    使用できない文字が含まれているか、{TAG_MAX_LENGTH}
                    文字を超えています
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    該当するタグがありません
                  </span>
                )}
              </CommandEmpty>
              {INTEREST_TAGS.map((category) => (
                <CommandGroup key={category.category} heading={category.category}>
                  {category.tags.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => toggleTag(tag)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {selected.has(tag) ? (
                          <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>{tag}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {showCustomAdd && (
                <CommandGroup heading="カスタムタグ">
                  <CommandItem
                    value={`__custom__${search.trim()}`}
                    onSelect={() => {
                      const tag = search.trim()
                      if (isValidTag(tag) && !selected.has(tag) && value.length < maxTags) {
                        onChange([...value, tag])
                        setSearch("")
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span>
                        &ldquo;{search.trim()}&rdquo; を新しく追加
                      </span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
