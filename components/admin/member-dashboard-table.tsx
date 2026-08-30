"use client";

import { useState, useMemo } from "react";
import type { AdminMemberRow } from "@/lib/admin/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal } from "lucide-react";

type ColumnDef = {
  id: string;
  label: string;
  defaultVisible: boolean;
  render: (row: AdminMemberRow) => React.ReactNode;
};

const COLUMNS: ColumnDef[] = [
  {
    id: "name",
    label: "氏名",
    defaultVisible: true,
    render: (r) => (
      <div>
        <div className="font-medium">
          {r.lastName} {r.firstName}
        </div>
        {r.nickname && (
          <div className="text-xs text-muted-foreground">{r.nickname}</div>
        )}
      </div>
    ),
  },
  {
    id: "discord",
    label: "Discord",
    defaultVisible: true,
    render: (r) => (
      <div>
        <div className="text-sm">{r.discordUsername}</div>
        {r.discordHandle && (
          <div className="text-xs text-muted-foreground">
            @{r.discordHandle}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "studentId",
    label: "学籍番号",
    defaultVisible: true,
    render: (r) => (
      <span className="font-mono text-sm">{r.studentId || "—"}</span>
    ),
  },
  {
    id: "memberType",
    label: "種別",
    defaultVisible: true,
    render: (r) =>
      r.memberType ? (
        <Badge variant="outline">{r.memberType}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "year",
    label: "学年",
    defaultVisible: true,
    render: (r) => r.year || <span className="text-muted-foreground">—</span>,
  },
  {
    id: "faculty",
    label: "学部/学府",
    defaultVisible: true,
    render: (r) =>
      r.faculty || <span className="text-muted-foreground">—</span>,
  },
  {
    id: "interests",
    label: "興味分野",
    defaultVisible: false,
    render: (r) =>
      r.interests.length > 0 ? (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {r.interests.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "github",
    label: "GitHub",
    defaultVisible: false,
    render: (r) =>
      r.github ? (
        <a
          href={`https://github.com/${r.github}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          {r.github}
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "x",
    label: "X",
    defaultVisible: false,
    render: (r) =>
      r.x ? (
        <a
          href={`https://x.com/${r.x}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          @{r.x}
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "line",
    label: "LINE",
    defaultVisible: true,
    render: (r) =>
      r.hasLine ? (
        <span className="text-sm">{r.lineName || "—"}</span>
      ) : (
        <span className="text-muted-foreground">未連携</span>
      ),
  },
  {
    id: "status",
    label: "ステータス",
    defaultVisible: true,
    render: (r) => {
      if (r.optedOut) return <Badge variant="destructive">退会済</Badge>;
      if (r.onboardingCompleted)
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            登録済
          </Badge>
        );
      return <Badge variant="outline">未完了</Badge>;
    },
  },
  {
    id: "createdAt",
    label: "登録日",
    defaultVisible: false,
    render: (r) =>
      r.createdAt ? (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(r.createdAt).toLocaleDateString("ja-JP")}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

const MEMBER_TYPES = ["学部生", "院生", "その他", "卒業生"] as const;

// 各タブで独立して機能するフィルターパネル
function FilterPanel({
  members,
  visibleColumns,
  onToggleColumn,
}: {
  members: AdminMemberRow[];
  visibleColumns: Set<string>;
  onToggleColumn: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  // 空 = すべての種別を表示、選択あり = 選択した種別のみ表示
  const [typeFilter, setTypeFilter] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (typeFilter.size > 0 && !typeFilter.has(m.memberType ?? "")) {
        return false;
      }
      if (!q) return true;
      return (
        `${m.lastName}${m.firstName}`.includes(q) ||
        m.nickname.toLowerCase().includes(q) ||
        m.discordUsername.toLowerCase().includes(q) ||
        (m.discordHandle ?? "").toLowerCase().includes(q) ||
        m.studentId.includes(q)
      );
    });
  }, [members, query, typeFilter]);

  const visibleCols = COLUMNS.filter((c) => visibleColumns.has(c.id));

  function toggleType(t: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="氏名・Discord・学籍番号で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <SlidersHorizontal className="h-4 w-4" />
              カラム
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>表示カラム</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.has(col.id)}
                onCheckedChange={() => onToggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-sm text-muted-foreground">
          {filtered.length} / {members.length} 件
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">種別</span>
        {MEMBER_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer ${
              typeFilter.has(t)
                ? "bg-foreground text-background border-foreground"
                : "border-dashed text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
        {typeFilter.size > 0 && (
          <button
            onClick={() => setTypeFilter(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
          >
            解除
          </button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleCols.map((col) => (
                <TableHead key={col.id} className="whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleCols.length}
                  className="text-center text-muted-foreground py-8"
                >
                  該当するメンバーがいません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.discordId}>
                  {visibleCols.map((col) => (
                    <TableCell key={col.id} className="align-top py-2">
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function MemberDashboardTable({
  members,
}: {
  members: AdminMemberRow[];
}) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)),
  );

  const activeMembers = useMemo(
    () => members.filter((m) => !m.optedOut),
    [members],
  );
  const retiredMembers = useMemo(
    () => members.filter((m) => m.optedOut),
    [members],
  );

  function toggleColumn(id: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">
          在籍中
          <span className="ml-1.5 text-xs opacity-70">
            {activeMembers.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="retired">
          退会済
          <span className="ml-1.5 text-xs opacity-70">
            {retiredMembers.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-4">
        <FilterPanel
          members={activeMembers}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />
      </TabsContent>

      <TabsContent value="retired" className="mt-4">
        <FilterPanel
          members={retiredMembers}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />
      </TabsContent>
    </Tabs>
  );
}
