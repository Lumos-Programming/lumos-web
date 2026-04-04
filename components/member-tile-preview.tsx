"use client"

import { useState } from "react"
import Image from "next/image"
import { getRingColorClass, getMemberTypeBadgeClass, getMemberTypeBadgeLabel } from "@/types/member"
import { BioSection } from "@/components/member-detail-shared"
import { SnsChip } from "@/components/sns-chips"
import { MemberTile } from "@/components/member-tile"

export type { SnsEntry } from "@/components/sns-chips"

export interface MemberTileData {
  main: string
  sub?: string
  department: string
  image: string
  memberType?: string
  year?: string
  currentOrg?: string
  ringColor?: string
  snsAvatar?: string
  topInterests?: string[]
}

export interface MemberDetailData extends MemberTileData {
  role?: string
  bio?: string
  sns?: import("@/components/sns-chips").SnsEntry[]
  interests?: string[]
}

// --- Tile previews ---

export function InternalTilePreview({ data, label }: { data: MemberTileData; label?: string }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <MemberTile
        main={data.main}
        sub={data.sub}
        department={data.department}
        image={data.image}
        snsAvatar={data.snsAvatar}
        ringColor={data.ringColor}
        memberType={data.memberType}
        year={data.year}
        currentOrg={data.currentOrg}
        topInterests={data.topInterests}
        preview={true}
      />
    </div>
  )
}

export function ExternalTilePreview({ data, label, allowPublic }: { data: MemberTileData; label?: string; allowPublic: boolean }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className={allowPublic ? "" : "opacity-40"}>
          <MemberTile
            main={data.main}
            sub={data.sub}
            department={data.department}
            image={data.image}
            snsAvatar={data.snsAvatar}
            ringColor={data.ringColor}
            memberType={data.memberType}
            year={data.year}
            currentOrg={data.currentOrg}
            topInterests={data.topInterests}
            avatarSize="md"
            preview={true}
          />
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

function DetailPreview({ data, label, allowPublic }: { data: MemberDetailData; label?: string; allowPublic?: boolean }) {
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
                    {getMemberTypeBadgeLabel(data.memberType, data.year)}
                  </span>
                )}
                {data.role && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{data.role}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {dept}
              </p>
            </div>
          </div>
          {data.sns && data.sns.length > 0 && (
            <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
              {data.sns.map((entry) => (
                <SnsChip key={entry.platform} entry={entry} />
              ))}
            </div>
          )}
          {data.interests && data.interests.length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-1">
              {data.interests.map((tag) => (
                <span key={tag} className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="px-4 pb-4">
            <BioSection bio={data.bio} clamp />
          </div>
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
  return <DetailPreview data={data} />
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
