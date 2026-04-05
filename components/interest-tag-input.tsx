"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { X, Star, Plus, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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

// --- Sortable chip ---

interface SortableChipProps {
  tag: string
  isTop: boolean
  onToggleTop: () => void
  onRemove: () => void
}

function SortableChip({ tag, isTop, onToggleTop, onRemove }: SortableChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={[
        "inline-flex items-center gap-1 text-xs font-medium pl-1 pr-1 py-1.5 rounded-full select-none",
        isDragging ? "opacity-80 shadow-lg" : "transition-all duration-200",
        isTop
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-300 dark:ring-purple-700 shadow-sm"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      ].join(" ")}
    >
      <button
        type="button"
        className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3 text-gray-400 dark:text-gray-500" />
      </button>
      {isTop && (
        <Star
          className="w-3.5 h-3.5 flex-shrink-0 text-purple-500 dark:text-purple-400"
          fill="currentColor"
        />
      )}
      <button
        type="button"
        onClick={onToggleTop}
        className="cursor-pointer hover:underline"
      >
        {tag}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

// --- Main component ---

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

  // Display order: Top 3 first (in topInterests order), then the rest (preserving value order)
  const topSet = useMemo(() => new Set(topInterests), [topInterests])
  const sortedTags = useMemo(() => {
    const top = topInterests.filter((t) => value.includes(t))
    const rest = value.filter((t) => !topSet.has(t))
    return [...top, ...rest]
  }, [value, topInterests, topSet])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = sortedTags.indexOf(active.id as string)
      const newIndex = sortedTags.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return

      // Reorder sortedTags
      const reordered = [...sortedTags]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      // First MAX_TOP_INTERESTS items become topInterests
      const newTop = reordered.slice(0, MAX_TOP_INTERESTS).filter((t) => value.includes(t))
      const newValue = reordered.filter((t) => value.includes(t))

      onChange(newValue)
      onTopInterestsChange(newTop)
    },
    [sortedTags, value, onChange, onTopInterestsChange]
  )

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
        // Auto-add to Top 3 if there's room
        if (topInterests.length < MAX_TOP_INTERESTS) {
          onTopInterestsChange([...topInterests, tag])
        }
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
      } else if (topInterests.length < MAX_TOP_INTERESTS) {
        onTopInterestsChange([...topInterests, tag])
      } else {
        // Replace the last Top 3 entry with the clicked tag
        onTopInterestsChange([...topInterests.slice(0, -1), tag])
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
      {sortedTags.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedTags} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map((tag) => (
                <SortableChip
                  key={tag}
                  tag={tag}
                  isTop={topSet.has(tag)}
                  onToggleTop={() => toggleTop(tag)}
                  onRemove={() => removeTag(tag)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Top 3 hint */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ドラッグで並び替え・タップで Top 3 を変更（{topInterests.length}/{MAX_TOP_INTERESTS}）
        </p>
      )}

      {/* Tag selector */}
      <Popover open={open} onOpenChange={(v) => {
        setOpen(v)
        if (v && triggerRef.current) {
          // Wait for popover to render, then ensure its bottom is visible
          requestAnimationFrame(() => {
            const rect = triggerRef.current!.getBoundingClientRect()
            // trigger bottom + sideOffset(4) + CommandList(300) + CommandInput(~44) + padding
            const popoverBottom = rect.bottom + 4 + 300 + 44 + 8
            const overflow = popoverBottom - window.innerHeight + 20
            if (overflow > 0) {
              window.scrollBy({ top: overflow, behavior: "smooth" })
            }
          })
        }
      }}>
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
            <CommandList className="h-[300px]">
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
              {INTEREST_TAGS.map((category) => {
                const available = category.tags.filter((tag) => !selected.has(tag))
                if (available.length === 0) return null
                return (
                  <CommandGroup key={category.category} heading={category.category}>
                    {available.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => toggleTag(tag)}
                        className="cursor-pointer"
                      >
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              {showCustomAdd && (
                <CommandGroup heading="カスタムタグ">
                  <CommandItem
                    value={`__custom__${search.trim()}`}
                    onSelect={() => {
                      const tag = search.trim()
                      if (isValidTag(tag) && !selected.has(tag) && value.length < maxTags) {
                        onChange([...value, tag])
                        if (topInterests.length < MAX_TOP_INTERESTS) {
                          onTopInterestsChange([...topInterests, tag])
                        }
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
