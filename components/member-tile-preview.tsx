"use client"

import Image from "next/image"
import { getRingColorClass, getMemberTypeBadgeClass } from "@/types/member"

interface MemberTileData {
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

interface InternalTilePreviewProps {
  data: MemberTileData
  label?: string
}

export function InternalTilePreview({ data, label }: InternalTilePreviewProps) {
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

interface ExternalTilePreviewProps {
  data: MemberTileData
  label?: string
  allowPublic: boolean
}

export function ExternalTilePreview({ data, label, allowPublic }: ExternalTilePreviewProps) {
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
