"use client"

import { useState } from "react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import { getRingColorClass, getMemberTypeBadgeClass } from "@/types/member"

export interface MemberTileData {
  main: string
  sub?: string
  department: string
  image: string
  hasFace: boolean
  memberType?: string
  currentOrg?: string
  ringColor?: string
  snsAvatar?: string
}

export interface SnsEntry {
  platform: "github" | "x" | "discord" | "linkedin"
  username: string
  url?: string
  avatarUrl?: string
}

export interface MemberDetailData extends MemberTileData {
  role?: string
  year?: string
  bio?: string
  sns?: SnsEntry[]
}

// --- Brand config ---

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

const SNS_BRAND: Record<SnsEntry["platform"], { bg: string; text: string; Logo: (props: { className?: string }) => React.ReactNode }> = {
  github:   { bg: "bg-[#24292f] dark:bg-[#333]", text: "text-white", Logo: GitHubLogo },
  x:        { bg: "bg-black dark:bg-[#1a1a1a]",  text: "text-white", Logo: XLogo },
  discord:  { bg: "bg-[#5865F2]",                 text: "text-white", Logo: DiscordLogo },
  linkedin: { bg: "bg-[#0A66C2]",                 text: "text-white", Logo: LinkedInLogo },
}

function SnsChip({ entry }: { entry: SnsEntry }) {
  const brand = SNS_BRAND[entry.platform]
  const inner = (
    <>
      <brand.Logo className="w-3.5 h-3.5 flex-shrink-0" />
      {entry.avatarUrl && (
        <div className="w-4 h-4 relative rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/30">
          <Image src={entry.avatarUrl} alt="" fill className="object-cover" />
        </div>
      )}
      <span className="text-[11px] font-medium leading-none truncate max-w-[100px]">
        {entry.platform === "discord" ? entry.username : `@${entry.username}`}
      </span>
    </>
  )
  const className = `inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 ${brand.bg} ${brand.text} ${entry.url ? "hover:opacity-80 transition-opacity" : ""}`
  if (entry.url) {
    return (
      <a href={entry.url} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return <div className={className}>{inner}</div>
}

// --- Tile previews ---

export function InternalTilePreview({ data, label }: { data: MemberTileData; label?: string }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <div className="flex flex-col items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 p-4">
        <div className="relative flex-shrink-0">
          <div className={`w-16 h-16 relative rounded-full overflow-hidden ring-2 ${getRingColorClass(data.ringColor)}`}>
            <Image src={data.image} alt="内部プレビュー" fill className="object-cover" />
            {!data.hasFace && (
              <div className="absolute inset-0 flex items-end justify-center bg-black/20">
                <span className="text-[10px] text-white bg-black/50 px-1 rounded mb-1">あとで設定</span>
              </div>
            )}
          </div>
          {data.snsAvatar && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden">
              <Image src={data.snsAvatar} alt="" fill className="object-cover" />
            </div>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate w-full text-center">
          {data.main}
        </p>
        {data.sub && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">{data.sub}</p>
        )}
        {data.memberType && (
          <span className={`mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getMemberTypeBadgeClass(data.memberType)}`}>
            {data.memberType}
          </span>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
          {data.memberType === "卒業生" && data.currentOrg ? data.currentOrg : data.department}
        </p>
      </div>
    </div>
  )
}

export function ExternalTilePreview({ data, label, allowPublic }: { data: MemberTileData; label?: string; allowPublic: boolean }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className={`flex flex-col items-center p-4 ${allowPublic ? "" : "opacity-40"}`}>
          <div className={`w-20 h-20 relative rounded-full overflow-hidden ring-2 ${getRingColorClass(data.ringColor)}`}>
            <Image src={data.image} alt="外部プレビュー" fill className="object-cover" />
            {!data.hasFace && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="text-[10px] text-white bg-black/50 px-1 rounded">あとで設定</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100 truncate w-full text-center">{data.main}</p>
          {data.sub && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">{data.sub}</p>
          )}
          {data.memberType && (
            <span className={`mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getMemberTypeBadgeClass(data.memberType)}`}>
              {data.memberType}
            </span>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
            {data.memberType === "卒業生" && data.currentOrg ? data.currentOrg : data.department}
          </p>
        </div>
        {!allowPublic && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-gray-800/80 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">HP掲載 OFF</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Detail preview ---

function DetailPreview({ data, label, allowPublic, hideSns }: { data: MemberDetailData; label?: string; allowPublic?: boolean; hideSns?: boolean }) {
  const dept = data.memberType === "卒業生" && data.currentOrg ? data.currentOrg : data.department
  const isDisabled = allowPublic === false
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className={isDisabled ? "opacity-40" : ""}>
          <div className="flex gap-4 p-4">
            <div className="flex-shrink-0">
              <div className={`w-20 h-20 relative rounded-full overflow-hidden ring-2 ${getRingColorClass(data.ringColor)}`}>
                <Image src={data.image} alt="詳細プレビュー" fill className="object-cover" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{data.main}</p>
              {data.sub && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.sub}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {data.memberType && (
                  <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getMemberTypeBadgeClass(data.memberType)}`}>
                    {data.memberType}
                  </span>
                )}
                {data.role && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{data.role}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {[dept, data.year].filter(Boolean).join(" ")}
              </p>
            </div>
          </div>
          {!hideSns && data.sns && data.sns.length > 0 && (
            <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
              {data.sns.map((entry) => (
                <SnsChip key={entry.platform} entry={entry} />
              ))}
            </div>
          )}
          {data.bio && (
            <div className="px-4 pb-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 line-clamp-3 text-xs">
                <ReactMarkdown>{data.bio}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
        {isDisabled && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-gray-800/80 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">HP掲載 OFF</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Toggle ---

interface PreviewToggleProps {
  internalData: MemberDetailData
  externalData: MemberDetailData
  allowPublic: boolean
}

function TogglePill({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 text-xs">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1 rounded-full transition-colors ${value === opt.key ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium" : "text-gray-500 dark:text-gray-400"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SingleDetailPreview({ data }: { data: MemberDetailData }) {
  return <DetailPreview data={data} hideSns />
}

// --- Composable building blocks (for breakout layout) ---

export function TilePreviewGrid({ internalData, externalData, allowPublic }: { internalData: MemberTileData; externalData: MemberTileData; allowPublic: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <InternalTilePreview data={internalData} label="内部" />
      <ExternalTilePreview data={externalData} allowPublic={allowPublic} label="外部HP" />
    </div>
  )
}

export function DetailPreviewPanel({ internalData, externalData, allowPublic }: { internalData: MemberDetailData; externalData: MemberDetailData; allowPublic: boolean }) {
  const [detailSide, setDetailSide] = useState<"internal" | "external">("internal")
  return (
    <div className="space-y-3">
      {/* Desktop: side-by-side */}
      <div className="hidden sm:grid grid-cols-2 gap-4">
        <DetailPreview data={internalData} label="内部" />
        <DetailPreview data={externalData} label="外部HP" allowPublic={allowPublic} />
      </div>
      {/* Mobile: sub-toggle */}
      <div className="sm:hidden space-y-2">
        <div className="flex justify-center">
          <TogglePill
            options={[{ key: "internal", label: "内部" }, { key: "external", label: "外部HP" }]}
            value={detailSide}
            onChange={(k) => setDetailSide(k as "internal" | "external")}
          />
        </div>
        {detailSide === "internal" ? (
          <DetailPreview data={internalData} />
        ) : (
          <DetailPreview data={externalData} allowPublic={allowPublic} />
        )}
      </div>
    </div>
  )
}

// --- All-in-one toggle (used by profile-edit where width is sufficient) ---

export function MemberPreviewToggle({ internalData, externalData, allowPublic }: PreviewToggleProps) {
  const [view, setView] = useState<"tile" | "detail">("tile")
  const [detailSide, setDetailSide] = useState<"internal" | "external">("internal")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">表示プレビュー</p>
        <TogglePill
          options={[{ key: "tile", label: "一覧" }, { key: "detail", label: "詳細" }]}
          value={view}
          onChange={(k) => setView(k as "tile" | "detail")}
        />
      </div>
      {view === "tile" ? (
        <div className="grid grid-cols-2 gap-3">
          <InternalTilePreview data={internalData} label="内部" />
          <ExternalTilePreview data={externalData} allowPublic={allowPublic} label="外部HP" />
        </div>
      ) : (
        <>
          {/* Desktop: side-by-side in wider container */}
          <div className="hidden sm:block -mx-4 md:-mx-8 px-4 md:px-8">
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <DetailPreview data={internalData} label="内部" />
              <DetailPreview data={externalData} label="外部HP" allowPublic={allowPublic} />
            </div>
          </div>
          {/* Mobile: sub-toggle for internal/external */}
          <div className="sm:hidden space-y-2">
            <div className="flex justify-center">
              <TogglePill
                options={[{ key: "internal", label: "内部" }, { key: "external", label: "外部HP" }]}
                value={detailSide}
                onChange={(k) => setDetailSide(k as "internal" | "external")}
              />
            </div>
            {detailSide === "internal" ? (
              <DetailPreview data={internalData} />
            ) : (
              <DetailPreview data={externalData} allowPublic={allowPublic} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
