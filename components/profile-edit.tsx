"use client"

import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VisibilityToggle } from "@/components/ui/visibility-toggle"
import { toast } from "@/hooks/use-toast"
import { cropAndResizeImage } from "@/lib/image-crop"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"
import ReactMarkdown from "react-markdown"
import Link from "next/link"
import type { Profile, VisibilityLevel } from "@/types/profile"
import { DEFAULT_RING_COLOR } from "@/types/member"
import type { RingColorKey } from "@/types/member"
import { RingColorPicker } from "@/components/ring-color-picker"
import { MemberPreviewToggle } from "@/components/member-tile-preview"

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
  lastNameRomaji: "姓（ローマ字）",
  firstNameRomaji: "名（ローマ字）",
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
  lastNameRomaji: "",
  firstNameRomaji: "",
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
    birthDate: "internal",
    bio: "public",
    line: "internal",
    github: "public",
    x: "public",
    linkedin: "public",
    discord: "public",
  },
}

const VISIBILITY_FIELD_KEYS = ["nickname", "lastName", "firstName", "faculty", "currentOrg", "birthDate", "bio", "github", "x", "linkedin", "line", "discord"] as const

export default function ProfileEdit() {
  const [isEditing, setIsEditing] = useState(true)
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [allowPublic, setAllowPublic] = useState(true)
  const [loading, setLoading] = useState(true)
  // Image state
  const [discordId, setDiscordId] = useState("")
  const [discordAvatarHash, setDiscordAvatarHash] = useState("")
  const [lineAvatar, setLineAvatar] = useState("")
  const [lineLinked, setLineLinked] = useState(false)
  const [faceImageUrl, setFaceImageUrl] = useState("")
  const [primaryAvatar, setPrimaryAvatar] = useState<"face" | "discord" | "line" | "default">("face")
  const [ringColor, setRingColor] = useState<RingColorKey>(DEFAULT_RING_COLOR)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [faculty, setFaculty] = useState("")
  const [year, setYear] = useState("")
  const [role, setRole] = useState("")
  const [memberType, setMemberType] = useState("")
  const [currentOrg, setCurrentOrg] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

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
            birthDate: data.visibility?.birthDate ?? "internal",
            line: data.visibility?.line ?? "internal",
            github: data.visibility?.github ?? "public",
            x: data.visibility?.x ?? "public",
            linkedin: data.visibility?.linkedin ?? "public",
            discord: data.visibility?.discord ?? "public",
          }
          // allowPublic が保存されていればそれを使い、なければ既存 visibility から推定
          if (typeof data.allowPublic === "boolean") {
            setAllowPublic(data.allowPublic)
          } else {
            const hasPublic = VISIBILITY_FIELD_KEYS.some((k) => vis[k] === "public")
            setAllowPublic(hasPublic)
          }
          const currentFaculty = data.enrollments?.find((e: { isCurrent?: boolean }) => e.isCurrent)?.faculty ?? ""
          setFaculty(currentFaculty)
          const fiscalYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
          setYear(data.yearByFiscal?.[String(fiscalYear)] ?? "")
          setRole(data.role ?? "")
          if (data.discordId) setDiscordId(data.discordId)
          if (data.discordAvatar) setDiscordAvatarHash(data.discordAvatar)
          if (data.lineAvatar) setLineAvatar(data.lineAvatar)
          setLineLinked(!!data.lineId)
          if (data.faceImage) setFaceImageUrl(data.faceImage)
          if (data.primaryAvatar) setPrimaryAvatar(data.primaryAvatar)
          if (data.ringColor) setRingColor(data.ringColor)
          if (data.memberType) setMemberType(data.memberType)
          if (data.currentOrg) setCurrentOrg(data.currentOrg)
          setProfile({
            studentId: data.studentId ?? "",
            nickname: data.nickname ?? "",
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            lastNameRomaji: data.lastNameRomaji ?? "",
            firstNameRomaji: data.firstNameRomaji ?? "",
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
        body: JSON.stringify({ ...profile, allowPublic, primaryAvatar, ringColor }),
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

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropImageSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [])

  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return
    setImageUploading(true)
    try {
      const blob = await cropAndResizeImage(cropImageSrc, croppedAreaPixels, { maxSize: 1024 })
      const formData = new FormData()
      formData.append("image", blob, "profile.webp")
      const res = await fetch("/api/profile/image", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setFaceImageUrl(url)
        setCropImageSrc(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({
          variant: "destructive",
          title: "アップロードに失敗しました",
          description: data.error || "しばらく経ってから再度お試しください。",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "アップロードに失敗しました",
        description: "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
      })
    } finally {
      setImageUploading(false)
    }
  }, [cropImageSrc, croppedAreaPixels])

  const resolveAvatar = useCallback((id: string, avatar: string): string => {
    if (!avatar) return "/placeholder.svg"
    if (avatar.startsWith("http")) return avatar
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
  }, [])

  const discordAvatarUrl = useMemo(() => resolveAvatar(discordId, discordAvatarHash), [resolveAvatar, discordId, discordAvatarHash])

  const getInitials = useCallback(() => {
    const f = profile.firstNameRomaji?.trim()
    const l = profile.lastNameRomaji?.trim()
    if (f && l) return `${f[0].toUpperCase()}. ${l[0].toUpperCase()}.`
    return ""
  }, [profile.firstNameRomaji, profile.lastNameRomaji])

  const internalPreview = useMemo(() => {
    const v = profile.visibility
    const hasName = v.lastName !== "private" && v.firstName !== "private"
    const fullName = hasName ? `${profile.lastName} ${profile.firstName}`.trim() : undefined
    const hasNickname = v.nickname !== "private" && !!profile.nickname
    const nickname = hasNickname ? profile.nickname : undefined

    let main: string
    let sub: string | undefined
    if (nickname && fullName && nickname !== fullName) {
      main = nickname
      sub = fullName
    } else if (nickname) {
      main = nickname
    } else if (fullName) {
      main = fullName
    } else {
      main = getInitials() || profile.discord || "名前未設定"
    }

    const dept = v.faculty !== "private" ? faculty : ""
    const mainImage = faceImageUrl || "/assets/avatar-placeholder.svg"
    const hasFace = !!faceImageUrl
    return { main, sub, department: dept, image: mainImage, hasFace, snsAvatar: discordAvatarUrl !== "/placeholder.svg" ? discordAvatarUrl : undefined }
  }, [profile, faculty, faceImageUrl, discordAvatarUrl, getInitials])

  const externalPreview = useMemo(() => {
    const v = profile.visibility
    const hasName = v.lastName === "public" && v.firstName === "public"
    const fullName = hasName ? `${profile.lastName} ${profile.firstName}`.trim() : undefined
    const hasNickname = v.nickname === "public" && !!profile.nickname
    const nickname = hasNickname ? profile.nickname : undefined

    let main: string
    let sub: string | undefined
    if (nickname && fullName && nickname !== fullName) {
      main = nickname
      sub = fullName
    } else if (nickname) {
      main = nickname
    } else if (fullName) {
      main = fullName
    } else {
      main = getInitials() || profile.discord || "名前未設定"
    }

    const dept = v.faculty === "public" ? faculty : ""

    let image: string
    let hasFace = true
    const pa = primaryAvatar
    switch (pa) {
      case "face":
        if (faceImageUrl) { image = faceImageUrl } else { image = "/assets/avatar-placeholder.svg"; hasFace = false }
        break
      case "discord":
        image = discordAvatarUrl !== "/placeholder.svg" ? discordAvatarUrl : "/assets/avatar-placeholder.svg"
        break
      case "line":
        image = lineAvatar || "/assets/avatar-placeholder.svg"
        break
      default:
        image = "/assets/avatar-placeholder.svg"
        hasFace = false
    }
    return { main, sub, role, department: dept, year, image, hasFace }
  }, [profile, faculty, year, role, faceImageUrl, primaryAvatar, discordAvatarUrl, lineAvatar, getInitials])

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
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-500 text-white font-medium flex-shrink-0">非公開</span>
                <span>自分だけが閲覧できます。他のメンバーにも表示されません。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-block px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-medium flex-shrink-0">内部のみ</span>
                <span>Lumosメンバーだけが閲覧できます。外部向けHPには表示されません。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-block px-1.5 py-0.5 rounded-full bg-green-600 text-white font-medium flex-shrink-0">外部公開</span>
                <span>LumosのHP（公開サイト）にも表示されます。誰でも閲覧できます。</span>
              </div>
            </div>
          )}
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
          {/* 表示プレビュー */}
          {isEditing && (
            <MemberPreviewToggle
              internalData={{ ...internalPreview, ringColor, memberType, currentOrg }}
              externalData={{ ...externalPreview, ringColor, memberType, currentOrg, bio: profile.bio }}
              allowPublic={allowPublic}
            />
          )}
          {/* プロフィール画像セクション */}
          {isEditing && (
            <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <Label className="text-base font-semibold">プロフィール画像</Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 relative rounded-full overflow-hidden ring-4 ring-purple-100 dark:ring-purple-900/50 flex-shrink-0">
                  <Image
                    src={faceImageUrl || "/placeholder.svg"}
                    alt="プロフィール画像"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                  >
                    画像を変更
                  </Button>
                </div>
              </div>

              {/* Crop UI */}
              {cropImageSrc && (
                <div className="space-y-3">
                  <div className="relative w-full" style={{ height: 280 }}>
                    <Cropper
                      image={cropImageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, area) => setCroppedAreaPixels(area)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex-shrink-0">ズーム</span>
                    <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="ghost" size="sm" onClick={() => setCropImageSrc(null)}>キャンセル</Button>
                    <Button size="sm" onClick={handleCropConfirm} disabled={imageUploading}>{imageUploading ? "アップロード中..." : "切り抜き"}</Button>
                  </div>
                </div>
              )}

              {/* Primary avatar selection */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">公開ページの表示画像</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "face" as const, label: "顔写真", src: faceImageUrl || "/placeholder.svg", enabled: true },
                    { value: "discord" as const, label: "Discord", src: discordAvatarHash ? (discordAvatarHash.startsWith("http") ? discordAvatarHash : `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarHash}.png`) : "/placeholder.svg", enabled: !!discordAvatarHash },
                    { value: "line" as const, label: "LINE", src: lineAvatar || "/placeholder.svg", enabled: lineLinked && !!lineAvatar },
                    { value: "default" as const, label: "なし", src: "/placeholder.svg", enabled: true },
                  ]).map(({ value, label, src, enabled }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setPrimaryAvatar(value)}
                      className={[
                        "flex items-center gap-2 rounded-lg border-2 p-2 transition-all duration-200 text-left",
                        primaryAvatar === value
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-600"
                          : "border-gray-200 dark:border-gray-700",
                        !enabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-purple-300",
                      ].join(" ")}
                    >
                      <div className="w-8 h-8 relative rounded-full overflow-hidden flex-shrink-0">
                        <Image src={src} alt="" fill className="object-cover" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <RingColorPicker value={ringColor} onChange={setRingColor} />
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
                    ) : key === "lastNameRomaji" || key === "firstNameRomaji" ? (
                      <Input
                        value={profile[key] as string ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^A-Za-z\s-]/g, "")
                          const capitalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
                          setProfile({ ...profile, [key]: capitalized })
                        }}
                        placeholder={key === "lastNameRomaji" ? "Yamada" : "Taro"}
                      />
                    ) : (
                      <Input
                        value={profile[key] as string ?? ""}
                        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                        placeholder={`${FIELD_LABELS[key]}を入力してください`}
                      />
                    )}

                    {key === "lastNameRomaji" || key === "firstNameRomaji" ? (
                      <p className="text-xs text-gray-400">イニシャル表示に使用されます</p>
                    ) : key === "studentId" ? (
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
                if (key === "lastNameRomaji" || key === "firstNameRomaji") return null
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
