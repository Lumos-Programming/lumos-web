"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VisibilityToggle } from "@/components/ui/visibility-toggle"
import ReactMarkdown from "react-markdown"
import Link from "next/link"
import type { Profile, VisibilityLevel } from "@/types/profile"

function formatBirthDate(d: string) {
  const parts = d.split("-")
  if (parts.length >= 3) return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
  return d
}

const FIELD_LABELS: Partial<Record<keyof Omit<Profile, "visibility" | "role" | "year" | "skills" | "enrollments">, string>> = {
  studentId: "学籍番号",
  nickname: "ニックネーム",
  lastName: "姓",
  firstName: "名",
  currentOrg: "現在の所属",
  birthDate: "誕生日",
  bio: "自己紹介",
  line: "LINE",
  discord: "Discord",
  github: "GitHub",
  x: "X",
}

const SNS_FIELDS = new Set(["github", "x", "line", "discord"])

const PROFILE_FIELDS = Object.keys(FIELD_LABELS) as Array<keyof Omit<Profile, "visibility" | "role" | "year" | "skills" | "enrollments">>

const DEFAULT_PROFILE: Profile = {
  studentId: "",
  nickname: "",
  lastName: "",
  firstName: "",
  bio: "",
  line: "",
  discord: "",
  github: "",
  x: "",
  visibility: {
    studentId: "private",
    nickname: "public",
    lastName: "public",
    firstName: "public",
    faculty: "public",
    currentOrg: "public",
    birthDate: "private",
    bio: "public",
    line: "internal",
    github: "public",
    x: "public",
    discord: "public",
  },
}

const VISIBILITY_FIELD_KEYS = ["nickname", "lastName", "firstName", "faculty", "currentOrg", "birthDate", "bio", "github", "x", "line", "discord"] as const

export default function ProfileEdit() {
  const [isEditing, setIsEditing] = useState(true)
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [allowPublic, setAllowPublic] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          const vis: Profile["visibility"] = {
            studentId: "private",
            nickname: data.visibility?.nickname ?? "public",
            lastName: data.visibility?.lastName ?? "public",
            firstName: data.visibility?.firstName ?? "public",
            faculty: data.visibility?.faculty ?? "public",
            bio: data.visibility?.bio ?? "public",
            currentOrg: data.visibility?.currentOrg ?? "public",
            birthDate: data.visibility?.birthDate ?? "private",
            line: data.visibility?.line ?? "internal",
            github: data.visibility?.github ?? "public",
            x: data.visibility?.x ?? "public",
            discord: data.visibility?.discord ?? "public",
          }
          // allowPublic が保存されていればそれを使い、なければ既存 visibility から推定
          if (typeof data.allowPublic === "boolean") {
            setAllowPublic(data.allowPublic)
          } else {
            const hasPublic = VISIBILITY_FIELD_KEYS.some((k) => vis[k] === "public")
            setAllowPublic(hasPublic)
          }
          setProfile({
            studentId: data.studentId ?? "",
            nickname: data.nickname ?? "",
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            bio: data.bio ?? "",
            birthDate: data.birthDate ?? "",
            currentOrg: data.currentOrg ?? "",
            line: data.line ?? "",
            discord: data.discordUsername ?? "",
            github: data.github ?? "",
            x: data.x ?? "",
            visibility: vis,
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handlePublish = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, allowPublic }),
      })

      if (response.ok) {
        alert("プロフィールが保存されました！")
      } else {
        alert("保存に失敗しました。もう一度お試しください。")
      }
    } catch (error) {
      console.error("エラーが発生しました: ", error)
      alert("エラーが発生しました。もう一度お試しください。")
    }
  }

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <>
      {/* スライドトグル */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-gray-200 rounded-full p-1">
          <button
            onClick={() => setIsEditing(true)}
            className={`px-4 py-2 rounded-full ${isEditing ? "bg-purple-600 text-white" : "text-gray-700"}`}
          >
            編集モード
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className={`px-4 py-2 rounded-full ${!isEditing ? "bg-purple-600 text-white" : "text-gray-700"}`}
          >
            プレビューモード
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">
              {isEditing ? "編集モード" : "プレビューモード"}
            </div>
            {isEditing && (
              <Button onClick={handlePublish} variant="default">
                保存
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                const next = !allowPublic
                setAllowPublic(next)
                if (!next) {
                  setProfile((prev) => {
                    const vis = { ...prev.visibility }
                    for (const k of VISIBILITY_FIELD_KEYS) {
                      if (vis[k] === "public") vis[k] = "internal"
                    }
                    return { ...prev, visibility: vis }
                  })
                }
              }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click() }}
              className={[
                "w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all duration-200 cursor-pointer select-none",
                allowPublic
                  ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50",
              ].join(" ")}
            >
              <div>
                <p className={["font-semibold text-sm", allowPublic ? "text-green-800 dark:text-green-300" : "text-gray-700 dark:text-gray-300"].join(" ")}>
                  HPにメンバー情報を掲載する
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allowPublic ? "外部公開が選択できます" : "外部公開は無効になります（ログインメンバーのみ閲覧可）"}
                </p>
              </div>
              <div className={[
                "w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 relative",
                allowPublic ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600",
              ].join(" ")}>
                <span className={[
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                  allowPublic ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")} />
              </div>
            </div>
          )}
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PROFILE_FIELDS.map((key) => {
                const isSns = SNS_FIELDS.has(key)
                return (
                  <div
                    key={key}
                    className={key === "bio" ? "md:col-span-2 space-y-2" : "space-y-2"}
                  >
                    <div className="flex items-center justify-between">
                      <Label>{FIELD_LABELS[key]}</Label>
                      {key === "bio" && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            title="太字を挿入"
                            className="px-2 py-1 rounded bg-purple-800 text-white text-sm"
                            onClick={() => setProfile({ ...profile, bio: profile.bio + " **太字**" })}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            title="斜体を挿入"
                            className="px-2 py-1 rounded bg-purple-800 text-white text-sm"
                            onClick={() => setProfile({ ...profile, bio: profile.bio + " *斜体*" })}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            title="リンク挿入"
                            className="px-2 py-1 rounded bg-purple-800 text-white text-sm"
                            onClick={() => setProfile({ ...profile, bio: profile.bio + " [リンク名](https://example.com)" })}
                          >
                            🔗
                          </button>
                          <button
                            type="button"
                            title="インラインコードを挿入"
                            className="px-2 py-1 rounded bg-purple-800 text-white text-sm font-mono"
                            onClick={() => setProfile({ ...profile, bio: profile.bio + " `コード`" })}
                          >
                            {"</>"}
                          </button>
                          <button
                            type="button"
                            title="見出しを挿入"
                            className="px-2 py-1 rounded bg-purple-800 text-white text-sm"
                            onClick={() => setProfile({ ...profile, bio: profile.bio + "\n\n## 見出し" })}
                          >
                            H
                          </button>
                        </div>
                      )}
                    </div>

                    {isSns ? (
                      <div className="space-y-1">
                        <Input
                          value={profile[key] as string ?? ""}
                          disabled
                          placeholder={`${FIELD_LABELS[key]}は設定ページで変更できます`}
                          className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500">
                          <Link href="/internal/settings" className="underline text-purple-600">
                            SNS連携設定
                          </Link>
                          で変更できます
                        </p>
                      </div>
                    ) : key === "bio" ? (
                      <Textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={6}
                        className="mt-1"
                        placeholder="自己紹介を入力してください"
                      />
                    ) : key === "birthDate" ? (
                      <Input
                        type="date"
                        value={profile.birthDate ?? ""}
                        onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                        className="block w-full"
                      />
                    ) : (
                      <Input
                        value={profile[key] as string ?? ""}
                        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                        placeholder={`${FIELD_LABELS[key]}を入力してください`}
                      />
                    )}

                    {key === "studentId" ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          非公開（固定）
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 mr-1">公開範囲</span>
                        <VisibilityToggle
                          value={profile.visibility[key as keyof typeof profile.visibility] ?? "private"}
                          onChange={(v: VisibilityLevel) =>
                            setProfile({
                              ...profile,
                              visibility: {
                                ...profile.visibility,
                                [key]: v,
                              },
                            })
                          }
                          max={key === "line" || key === "birthDate" || !allowPublic ? "internal" : undefined}
                          min={key === "discord" ? "internal" : undefined}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PROFILE_FIELDS.map((key) => {
                if (SNS_FIELDS.has(key)) return null
                const visLevel = profile.visibility[key as keyof typeof profile.visibility]
                if (!visLevel || visLevel === "private") return null
                if (key === "firstName") return null
                return (
                  <div
                    key={key}
                    className={key === "bio" ? "md:col-span-2 space-y-2" : "space-y-2"}
                  >
                    <div className="flex items-center gap-2">
                      <Label>{key === "lastName" ? "氏名" : FIELD_LABELS[key]}</Label>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${visLevel === "public" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"}`}>
                        {visLevel === "public" ? "外部公開" : "内部のみ"}
                      </span>
                    </div>
                    {key === "bio" ? (
                      <ReactMarkdown>{profile.bio}</ReactMarkdown>
                    ) : key === "lastName" ? (
                      <p className="text-sm mt-1 whitespace-nowrap">
                        {profile.lastName} {profile.firstName}
                      </p>
                    ) : key === "birthDate" ? (
                      <p className="text-sm mt-1">{profile.birthDate ? formatBirthDate(profile.birthDate) : ""}</p>
                    ) : (
                      <p className="text-sm mt-1">{profile[key] as string ?? ""}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
