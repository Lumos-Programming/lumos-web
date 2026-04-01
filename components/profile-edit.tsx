"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import ReactMarkdown from "react-markdown"
import Link from "next/link"
import type { Profile } from "@/types/profile"
import { FACULTIES } from "@/types/profile"

const FIELD_LABELS: Record<keyof Omit<Profile, "visibility" | "role" | "year" | "skills">, string> = {
  studentId: "学籍番号",
  nickname: "ニックネーム",
  lastName: "姓",
  firstName: "名",
  faculty: "学部",
  bio: "自己紹介",
  line: "LINE",
  discord: "Discord",
  github: "GitHub",
  x: "X",
}

const SNS_FIELDS = new Set(["github", "x", "line", "discord"])

const PROFILE_FIELDS = Object.keys(FIELD_LABELS) as Array<keyof Omit<Profile, "visibility" | "role" | "year" | "skills">>

const DEFAULT_PROFILE: Profile = {
  studentId: "",
  nickname: "",
  lastName: "",
  firstName: "",
  faculty: "",
  bio: "",
  line: "",
  discord: "",
  github: "",
  x: "",
  visibility: {
    studentId: false,
    nickname: true,
    lastName: false,
    firstName: false,
    faculty: false,
    bio: true,
    line: false,
    github: false,
    x: false,
  },
}

export default function ProfileEdit() {
  const [isEditing, setIsEditing] = useState(true)
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setProfile({
            studentId: data.studentId ?? "",
            nickname: data.nickname ?? "",
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            faculty: data.faculty ?? "",
            bio: data.bio ?? "",
            line: data.line ?? "",
            discord: data.discordUsername ?? "",
            github: data.github ?? "",
            x: data.x ?? "",
            visibility: {
              studentId: data.visibility?.studentId ?? false,
              nickname: data.visibility?.nickname ?? true,
              lastName: data.visibility?.lastName ?? false,
              firstName: data.visibility?.firstName ?? false,
              faculty: data.visibility?.faculty ?? false,
              bio: data.visibility?.bio ?? true,
              line: data.visibility?.line ?? false,
              github: data.visibility?.github ?? false,
              x: data.visibility?.x ?? false,
            },
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
        body: JSON.stringify(profile),
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
                          value={profile[key]}
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
                    ) : key === "faculty" ? (
                      <select
                        value={profile.faculty}
                        onChange={(e) => setProfile({ ...profile, faculty: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-700 focus:border-purple-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      >
                        <option value="">選択してください</option>
                        {FACULTIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={profile[key]}
                        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                        placeholder={`${FIELD_LABELS[key]}を入力してください`}
                      />
                    )}

                    {!isSns && (
                      <div className="flex items-center space-x-2">
                        <Label>公開</Label>
                        <Switch
                          checked={profile.visibility[key as keyof typeof profile.visibility]}
                          onCheckedChange={(checked) =>
                            setProfile({
                              ...profile,
                              visibility: {
                                ...profile.visibility,
                                [key]: checked,
                              },
                            })
                          }
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
                const isVisible = profile.visibility[key as keyof typeof profile.visibility]
                if (!isVisible) return null
                if (key === "firstName") return null
                return (
                  <div
                    key={key}
                    className={key === "bio" ? "md:col-span-2 space-y-2" : "space-y-2"}
                  >
                    <Label>{key === "lastName" ? "氏名" : FIELD_LABELS[key]}</Label>
                    {key === "bio" ? (
                      <ReactMarkdown>{profile.bio}</ReactMarkdown>
                    ) : key === "lastName" ? (
                      <p className="text-sm mt-1 whitespace-nowrap">
                        {profile.lastName} {profile.firstName}
                      </p>
                    ) : (
                      <p className="text-sm mt-1">{profile[key]}</p>
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
