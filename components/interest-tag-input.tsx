"use client";

import { useState, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { X, Star, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  INTEREST_TAGS,
  MAX_TAGS,
  MAX_TOP_INTERESTS,
  isValidTag,
  TAG_MAX_LENGTH,
} from "@/types/interests";

// --- FLIP animation for programmatic reorder ---

function useFlip(containerRef: React.RefObject<HTMLDivElement | null>) {
  const prevRectsRef = useRef<Map<string, DOMRect> | null>(null);
  const rafHandlesRef = useRef<number[]>([]);

  const snapshot = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = new Map<string, DOMRect>();
    for (const child of Array.from(el.children) as HTMLElement[]) {
      const key = child.dataset.sortableId;
      if (key) map.set(key, child.getBoundingClientRect());
    }
    prevRectsRef.current = map;
  }, [containerRef]);

  // Runs every render; early-returns when no snapshot is pending
  useLayoutEffect(() => {
    const prev = prevRectsRef.current;
    if (!prev) return;
    prevRectsRef.current = null;

    const el = containerRef.current;
    if (!el) return;

    // Cancel any in-flight animations from a previous cycle
    for (const id of rafHandlesRef.current) cancelAnimationFrame(id);
    rafHandlesRef.current = [];

    for (const child of Array.from(el.children) as HTMLElement[]) {
      const key = child.dataset.sortableId;
      if (!key) continue;
      const oldRect = prev.get(key);
      if (!oldRect) continue;
      const newRect = child.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) continue;

      const prevTransition = child.style.transition;
      const prevTransform = child.style.transform;
      child.style.transition = "none";
      child.style.transform = `translate(${dx}px, ${dy}px)`;
      const rafId = requestAnimationFrame(() => {
        child.style.transition = "transform 200ms ease";
        child.style.transform = prevTransform || "";
        child.addEventListener(
          "transitionend",
          () => {
            child.style.transition = prevTransition;
          },
          { once: true },
        );
      });
      rafHandlesRef.current.push(rafId);
    }
  });

  // Cleanup on unmount
  useLayoutEffect(() => {
    return () => {
      for (const id of rafHandlesRef.current) cancelAnimationFrame(id);
    };
  }, []);

  return snapshot;
}

// --- Sortable chip ---

interface SortableChipProps {
  tag: string;
  isTop: boolean;
  onToggleTop: () => void;
  onRemove: () => void;
}

function SortableChip({
  tag,
  isTop,
  onToggleTop,
  onRemove,
}: SortableChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      data-sortable-id={tag}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium pl-1 pr-1 py-1.5 rounded-full select-none",
        isDragging ? "opacity-80 shadow-lg" : "transition-colors duration-200",
        isTop
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-300 dark:ring-purple-700 shadow-sm"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      )}
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
  );
}

// --- Main component ---

interface InterestTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  topInterests: string[];
  onTopInterestsChange: (top: string[]) => void;
  maxTags?: number;
}

export function InterestTagInput({
  value,
  onChange,
  topInterests,
  onTopInterestsChange,
  maxTags = MAX_TAGS,
}: InterestTagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const flipSnapshot = useFlip(chipsRef);

  const selected = useMemo(() => new Set(value), [value]);

  // Display order: Top 3 first (in topInterests order), then the rest (preserving value order)
  const topSet = useMemo(() => new Set(topInterests), [topInterests]);
  const sortedTags = useMemo(() => {
    const top = topInterests.filter((t) => value.includes(t));
    const rest = value.filter((t) => !topSet.has(t));
    return [...top, ...rest];
  }, [value, topInterests, topSet]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedTags.indexOf(active.id as string);
      const newIndex = sortedTags.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder sortedTags
      const reordered = [...sortedTags];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Preserve top membership, only update order
      const newTop = reordered.filter((t) => topInterests.includes(t));
      const newValue = reordered.filter((t) => value.includes(t));

      onChange(newValue);
      onTopInterestsChange(newTop);
    },
    [sortedTags, value, topInterests, onChange, onTopInterestsChange],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      flipSnapshot();
      if (selected.has(tag)) {
        onChange(value.filter((t) => t !== tag));
        if (topInterests.includes(tag)) {
          onTopInterestsChange(topInterests.filter((t) => t !== tag));
        }
      } else {
        if (value.length >= maxTags) return;
        onChange([...value, tag]);
        // Auto-add to Top 3 if there's room
        if (topInterests.length < MAX_TOP_INTERESTS) {
          onTopInterestsChange([...topInterests, tag]);
        }
      }
    },
    [
      value,
      onChange,
      topInterests,
      onTopInterestsChange,
      maxTags,
      selected,
      flipSnapshot,
    ],
  );

  const removeTag = useCallback(
    (tag: string) => {
      flipSnapshot();
      onChange(value.filter((t) => t !== tag));
      if (topInterests.includes(tag)) {
        onTopInterestsChange(topInterests.filter((t) => t !== tag));
      }
    },
    [value, onChange, topInterests, onTopInterestsChange, flipSnapshot],
  );

  const toggleTop = useCallback(
    (tag: string) => {
      flipSnapshot();
      if (topInterests.includes(tag)) {
        onTopInterestsChange(topInterests.filter((t) => t !== tag));
      } else if (topInterests.length < MAX_TOP_INTERESTS) {
        onTopInterestsChange([...topInterests, tag]);
      } else {
        // Replace the last Top 3 entry with the clicked tag
        onTopInterestsChange([...topInterests.slice(0, -1), tag]);
      }
    },
    [topInterests, onTopInterestsChange, flipSnapshot],
  );

  const canAddCustom =
    search.trim().length > 0 &&
    !selected.has(search.trim()) &&
    isValidTag(search.trim()) &&
    value.length < maxTags;

  // Check if search matches any preset
  const searchTrimmed = search.trim().toLowerCase();
  const hasExactPresetMatch = INTEREST_TAGS.some((cat) =>
    cat.tags.some((t) => t.toLowerCase() === searchTrimmed),
  );
  const hasExactSelectedMatch = value.some(
    (t) => t.toLowerCase() === searchTrimmed,
  );

  const showCustomAdd =
    canAddCustom && !hasExactPresetMatch && !hasExactSelectedMatch;

  // Popover height estimate: CommandInput(~44) + CommandList(300) + sideOffset(4) + padding(8)
  const POPOVER_HEIGHT_ESTIMATE = 356;
  const SCROLL_BOTTOM_MARGIN = 20;

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (v) {
      requestAnimationFrame(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const overflow =
          rect.bottom +
          POPOVER_HEIGHT_ESTIMATE -
          window.innerHeight +
          SCROLL_BOTTOM_MARGIN;
        if (overflow > 0) {
          window.scrollBy({ top: overflow, behavior: "smooth" });
        }
      });
    }
  }, []);

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
            <div ref={chipsRef} className="flex flex-wrap gap-2">
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

      {/* Top hint */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ドラッグで並び替え・タップで Top を変更（{topInterests.length}/
          {MAX_TOP_INTERESTS}）
        </p>
      )}

      {/* Tag selector */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              "w-full flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm",
              "bg-white dark:bg-gray-800 text-left",
              "hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
              value.length >= maxTags
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer",
            )}
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
                const available = category.tags.filter(
                  (tag) => !selected.has(tag),
                );
                if (available.length === 0) return null;
                return (
                  <CommandGroup
                    key={category.category}
                    heading={category.category}
                  >
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
                );
              })}
              {showCustomAdd && (
                <CommandGroup heading="カスタムタグ">
                  <CommandItem
                    value={`__custom__${search.trim()}`}
                    onSelect={() => {
                      const tag = search.trim();
                      if (
                        isValidTag(tag) &&
                        !selected.has(tag) &&
                        value.length < maxTags
                      ) {
                        onChange([...value, tag]);
                        if (topInterests.length < MAX_TOP_INTERESTS) {
                          onTopInterestsChange([...topInterests, tag]);
                        }
                        setSearch("");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span>&ldquo;{search.trim()}&rdquo; を新しく追加</span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
