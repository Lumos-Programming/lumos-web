"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import ReactMarkdown from "react-markdown"
import type { Profile } from "@/types/profile"
import { FACULTIES } from "@/types/profile"

const FIELD_LABELS: Record<keyof Omit<Profile, "visibility">, string> = {
  studentId: "学籍番号",
  nickname: "ニックネーム",
  lastName: "姓",
  firstName: "名",
  faculty: "学部",
  bio: "自己紹介",
  line: "LINE",
  discord: "Discord",
  github: "GitHub",
}

const PROFILE_FIELDS = Object.keys(FIELD_LABELS) as Array<keyof Omit<Profile, "visibility">>

export default function ProfileEdit() {
  const [isEditing, setIsEditing] = useState(true)
  const [profile, setProfile] = useState<Profile>({
    studentId: "2024001",
    nickname: "たろう",
    lastName: "山田",
    firstName: "太郎",
    faculty: "理工学部",
    bio: "**プログラミング**が好きです。特にWeb開発に興味があります。",
    line: "@yamada_line",
    discord: "yamada#1234",
    github: "github.com/yamada",
    visibility: {
      studentId: true,
      nickname: true,
      lastName: true,
      firstName: true,
      faculty: true,
      bio: true,
      line: false,
      discord: false,
      github: true,
    },
  })

  const handlePublish = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        alert("プロフィールが公開されました！")
      } else {
        alert("公開に失敗しました。もう一度お試しください。")
      }
    } catch (error) {
      console.error("エラーが発生しました: ", error)
      alert("エラーが発生しました。もう一度お試しください。")
    }
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
                公開
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PROFILE_FIELDS.map((key) => (
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

                  {key === "bio" ? (
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
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PROFILE_FIELDS.map((key) => {
                const isVisible = profile.visibility[key as keyof typeof profile.visibility]
                if (!isVisible) return null
                // Combine lastName + firstName into one entry
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
