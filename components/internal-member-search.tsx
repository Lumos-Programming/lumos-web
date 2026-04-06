"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { badgeVariants } from "@/components/ui/badge";
import InternalMemberList from "@/components/internal-member-list";
import type { Member } from "@/types/member";

const MEMBER_TYPE_FILTERS = [
  { key: "all", label: "すべて" },
  { key: "学部生", label: "学部生" },
  { key: "院生", label: "院生" },
  { key: "その他", label: "その他" },
  { key: "卒業生", label: "卒業生" },
];

interface MemberSearchProps {
  members: Member[];
}

export function InternalMemberSearch({ members }: MemberSearchProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = members;
    if (typeFilter !== "all") {
      result = result.filter((m) => m.memberType === typeFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.nickname && m.nickname.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [members, query, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-spring-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前・ニックネームで検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 focus-visible:shadow-md transition-shadow duration-200"
          />
        </div>
        <div
          className="flex gap-1.5 flex-wrap"
          role="group"
          aria-label="メンバー種別フィルター"
        >
          {MEMBER_TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={typeFilter === f.key}
              className={`${badgeVariants({ variant: typeFilter === f.key ? "default" : "outline" })} cursor-pointer transition-all duration-200 ${typeFilter === f.key ? "scale-105" : "hover:scale-105"}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="animate-spring-up stagger-tight-2 fill-mode-backwards">
        <InternalMemberList members={filtered} />
      </div>
    </div>
  );
}
