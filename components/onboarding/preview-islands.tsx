"use client";

import type { Dispatch, SetStateAction } from "react";
import type { RingColorKey } from "@/types/member";
import type { SnsEntry } from "@/components/sns-chips";
import {
  TilePreviewGrid,
  DetailPreviewPanel,
  SingleDetailPreview,
  InternalTilePreview,
} from "@/components/member-tile-preview";
import type { FormData } from "./types";

interface PreviewIslandStep4Props {
  form: FormData;
  ringColor: RingColorKey;
  onbInternalPreview: {
    main: string;
    sub?: string;
    department: string;
    year: string;
    primaryAvatar: string;
    secondaryAvatar?: string;
  };
  onbInternalSns: SnsEntry[];
}

export function PreviewIslandStep4({
  form,
  ringColor,
  onbInternalPreview,
  onbInternalSns,
}: PreviewIslandStep4Props) {
  return (
    <div className="w-full max-w-lg relative z-10 mt-4 space-y-4">
      {/* Tile preview */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-800/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
            タイルプレビュー
          </h3>
        </div>
        <div className="flex justify-center">
          <div className="w-48">
            <InternalTilePreview
              data={{
                ...onbInternalPreview,
                ringColor,
                memberType: form.memberType || undefined,
                currentOrg: form.currentOrg || undefined,
                topInterests: form.topInterests,
              }}
            />
          </div>
        </div>
      </div>
      {/* Detail preview */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-800/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
            詳細ページプレビュー
          </h3>
        </div>
        <SingleDetailPreview
          data={{
            ...onbInternalPreview,
            ringColor,
            memberType: form.memberType || undefined,
            currentOrg: form.currentOrg || undefined,
            bio: form.bio,
            sns: onbInternalSns,
            interests: form.interests,
            topInterests: form.topInterests,
          }}
        />
      </div>
    </div>
  );
}

interface PreviewIslandStep5Props {
  form: FormData;
  ringColor: RingColorKey;
  allowPublic: boolean;
  previewView: "tile" | "detail";
  setPreviewView: Dispatch<SetStateAction<"tile" | "detail">>;
  onbInternalPreview: {
    main: string;
    sub?: string;
    department: string;
    year: string;
    primaryAvatar: string;
    secondaryAvatar?: string;
  };
  onbExternalPreview: {
    main: string;
    sub?: string;
    department: string;
    year: string;
    primaryAvatar: string;
  };
  onbInternalSns: SnsEntry[];
  onbExternalSns: SnsEntry[];
}

export function PreviewIslandStep5({
  form,
  ringColor,
  allowPublic,
  previewView,
  setPreviewView,
  onbInternalPreview,
  onbExternalPreview,
  onbInternalSns,
  onbExternalSns,
}: PreviewIslandStep5Props) {
  return (
    <div className="w-full max-w-3xl relative z-10 mt-4">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-800/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              表示プレビュー
            </h3>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => setPreviewView("tile")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${previewView === "tile" ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              一覧
            </button>
            <button
              type="button"
              onClick={() => setPreviewView("detail")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${previewView === "detail" ? "bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-sm font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="9" x2="9" y2="21" />
              </svg>
              詳細
            </button>
          </div>
        </div>
        {previewView === "tile" ? (
          <TilePreviewGrid
            internalData={{
              ...onbInternalPreview,
              ringColor,
              memberType: form.memberType || undefined,
              currentOrg: form.currentOrg || undefined,
              topInterests: form.topInterests,
            }}
            externalData={{
              ...onbExternalPreview,
              ringColor,
              memberType: form.memberType || undefined,
              currentOrg: form.currentOrg || undefined,
              topInterests: form.topInterests,
            }}
            allowPublic={allowPublic}
          />
        ) : (
          <DetailPreviewPanel
            internalData={{
              ...onbInternalPreview,
              ringColor,
              memberType: form.memberType || undefined,
              currentOrg: form.currentOrg || undefined,
              bio: form.bio,
              sns: onbInternalSns,
              interests: form.interests,
              topInterests: form.topInterests,
            }}
            externalData={{
              ...onbExternalPreview,
              ringColor,
              memberType: form.memberType || undefined,
              currentOrg: form.currentOrg || undefined,
              bio: form.bio,
              sns: onbExternalSns,
              interests: form.interests,
              topInterests: form.topInterests,
            }}
            allowPublic={allowPublic}
          />
        )}
      </div>
    </div>
  );
}
