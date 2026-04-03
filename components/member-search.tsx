"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import MemberList from "@/components/member-list"
import type { Member } from "@/types/member"

const MEMBER_TYPE_FILTERS = [
  { key: "all", label: "すべて" },
  { key: "学部生", label: "学部生" },
  { key: "院生", label: "院生" },
  { key: "聴講生", label: "聴講生" },
  { key: "卒業生", label: "卒業生" },
]

interface MemberSearchProps {
  members: Member[]
}

export function MemberSearch({ members }: MemberSearchProps) {
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filtered = useMemo(() => {
    let result = members
    if (typeFilter !== "all") {
      result = result.filter((m) => m.memberType === typeFilter)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.nickname && m.nickname.toLowerCase().includes(q))
      )
    }
    return result
  }, [members, query, typeFilter])

  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in-80 slide-in-from-bottom-4 duration-500">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前・ニックネームで検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 focus-visible:shadow-md transition-shadow duration-200"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MEMBER_TYPE_FILTERS.map((f) => (
            <Badge
              key={f.key}
              variant={typeFilter === f.key ? "default" : "outline"}
              className={`cursor-pointer transition-all duration-200 ${typeFilter === f.key ? "scale-105" : "hover:scale-105"}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="animate-in fade-in-50 zoom-in-95 duration-200">
        <MemberList members={filtered} />
      </div>
    </div>
  )
}
