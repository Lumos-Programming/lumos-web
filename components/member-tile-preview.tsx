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

export interface MemberDetailData extends MemberTileData {
  role?: string
  year?: string
  bio?: string
}

export function InternalTilePreview({ data, label }: { data: MemberTileData; label?: string }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      <div className="flex flex-col items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 p-4">
        <div className="relative flex-shrink-0">
          <div className={`w-16 h-16 relative rounded-full overflow-hidden ring-2 ${getRingColorClass(data.ringColor)}`}>
            <Image
              src={data.image}
              alt="内部プレビュー"
              fill
              className="object-cover"
            />
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
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
            {data.sub}
          </p>
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
            <Image
              src={data.image}
              alt="外部プレビュー"
              fill
              className="object-cover"
            />
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

function DetailPreview({ data, allowPublic }: { data: MemberDetailData; allowPublic: boolean }) {
  const dept = data.memberType === "卒業生" && data.currentOrg ? data.currentOrg : data.department
  return (
    <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className={allowPublic ? "" : "opacity-40"}>
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
        {data.bio && (
          <div className="px-4 pb-4 -mt-1">
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 line-clamp-3 text-xs">
              <ReactMarkdown>{data.bio}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      {!allowPublic && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-gray-800/80 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">HP掲載 OFF</span>
        </div>
      )}
    </div>
  )
}

interface PreviewToggleProps {
  internalData: MemberTileData
  externalData: MemberDetailData
  allowPublic: boolean
}

export function MemberPreviewToggle({ internalData, externalData, allowPublic }: PreviewToggleProps) {
  const [view, setView] = useState<"tile" | "detail">("tile")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">表示プレビュー</p>
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("tile")}
            className={`px-3 py-1 rounded-full transition-colors ${view === "tile" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium" : "text-gray-500 dark:text-gray-400"}`}
          >
            一覧
          </button>
          <button
            type="button"
            onClick={() => setView("detail")}
            className={`px-3 py-1 rounded-full transition-colors ${view === "detail" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium" : "text-gray-500 dark:text-gray-400"}`}
          >
            詳細
          </button>
        </div>
      </div>
      {view === "tile" ? (
        <div className="grid grid-cols-2 gap-3">
          <InternalTilePreview data={internalData} label="内部" />
          <ExternalTilePreview data={externalData} allowPublic={allowPublic} label="外部HP" />
        </div>
      ) : (
        <DetailPreview data={externalData} allowPublic={allowPublic} />
      )}
    </div>
  )
}
