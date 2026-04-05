"use client"

import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownEditor } from "@/components/markdown-editor"
import { VisibilityToggle } from "@/components/ui/visibility-toggle"
import { toast } from "@/hooks/use-toast"
import { cropAndResizeImage } from "@/lib/image-crop"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"
import Link from "next/link"
import type { Profile, VisibilityLevel, MemberType } from "@/types/profile"
import { GENDER_OPTIONS, MEMBER_TYPES, ENROLLMENT_TYPES, ADMISSION_YEARS, FACULTIES, GRADUATE_SCHOOLS, getFacultyOptions } from "@/types/profile"
import type { EnrollmentType } from "@/types/profile"
import { getSchoolYearOptions } from "@/components/onboarding/types"
import { DEFAULT_RING_COLOR, getRingColorClass } from "@/types/member"
import type { RingColorKey } from "@/types/member"
import { RingColorPicker } from "@/components/ring-color-picker"
import { MemberPreviewToggle } from "@/components/member-tile-preview"
import type { SnsEntry } from "@/components/member-tile-preview"
import { LiquidSplashEffect } from "@/components/liquid-splash-effect"
import { InterestTagInput } from "@/components/interest-tag-input"
import { useSidebar } from "@/components/ui/sidebar"

const FIELD_LABELS: Partial<Record<keyof Omit<Profile, "visibility" | "role" | "year" | "enrollments">, string>> = {
  lastName: "姓",
  firstName: "名",
  lastNameRomaji: "姓（ローマ字）",
  firstNameRomaji: "名（ローマ字）",
  nickname: "ニックネーム",
  currentOrg: "現在の所属",
  birthDate: "誕生日",
  gender: "性別",
  bio: "プロフィール文",
  line: "LINE",
  discord: "Discord",
  github: "GitHub",
  x: "X",
}

const SNS_FIELDS = new Set(["github", "x", "line", "discord"])

const VISIBILITY_LABELS: Record<string, string> = {
  lastName: "姓・名",
  faculty: "学部/学府",
  currentOrg: "現在の所属",
  birthDate: "誕生日",
  gender: "性別",
  nickname: "ニックネーム",
  bio: "プロフィール文",
  discord: "Discord",
  line: "LINE",
  github: "GitHub",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
}

const VISIBILITY_DISPLAY_KEYS = ["lastName", "faculty", "currentOrg", "birthDate", "gender", "nickname", "bio", "discord", "line", "github", "x", "linkedin"] as const

const PROFILE_FIELDS = Object.keys(FIELD_LABELS) as Array<keyof Omit<Profile, "visibility" | "role" | "year" | "enrollments">>

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
    gender: "internal",
    bio: "public",
    line: "internal",
    github: "public",
    x: "public",
    linkedin: "public",
    discord: "public",
  },
}

const VISIBILITY_FIELD_KEYS = ["nickname", "lastName", "firstName", "faculty", "currentOrg", "birthDate", "gender", "bio", "discord", "line", "github", "x", "linkedin"] as const

type EnrollmentCache = {
  year: string; faculty: string; admissionYear: string
  enrollmentType: EnrollmentType | ""; transferYear: string
  graduationYear: string; currentOrg: string
  hasUndergrad: boolean | null; undergradFaculty: string
  undergradAdmissionYear: string; undergradEnrollmentType: EnrollmentType | ""
  undergradTransferYear: string
}

export default function ProfileEdit() {
  const { state: sidebarState, isMobile } = useSidebar()
  const [showPreview, setShowPreview] = useState(false)
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [allowPublic, setAllowPublic] = useState(true)
  const [loading, setLoading] = useState(true)
  // Image state
  const [discordId, setDiscordId] = useState("")
  const [discordAvatarHash, setDiscordAvatarHash] = useState("")
  const [lineAvatar, setLineAvatar] = useState("")
  const [lineLinked, setLineLinked] = useState(false)
  const [githubAvatar, setGithubAvatar] = useState("")
  const [xAvatar, setXAvatar] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [faceImageUrl, setFaceImageUrl] = useState("")
  const [primaryAvatar, setPrimaryAvatar] = useState<"face" | "discord" | "line" | "default">("face")
  const [ringColor, setRingColor] = useState<RingColorKey>(DEFAULT_RING_COLOR)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [blobAnimating, setBlobAnimating] = useState(false)
  const [faculty, setFaculty] = useState("")
  const [year, setYear] = useState("")
  const [role, setRole] = useState("")
  const [memberType, setMemberType] = useState<MemberType | "">("")
  const [currentOrg, setCurrentOrg] = useState("")
  const [admissionYear, setAdmissionYear] = useState("")
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType | "">("")
  const [transferYear, setTransferYear] = useState("")
  const [graduationYear, setGraduationYear] = useState("")
  const [hasUndergrad, setHasUndergrad] = useState<boolean | null>(null)
  const [undergradFaculty, setUndergradFaculty] = useState("")
  const [undergradAdmissionYear, setUndergradAdmissionYear] = useState("")
  const [undergradEnrollmentType, setUndergradEnrollmentType] = useState<EnrollmentType | "">("")
  const [undergradTransferYear, setUndergradTransferYear] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [topInterests, setTopInterests] = useState<string[]>([])
  const [bannerImageUrl, setBannerImageUrl] = useState("")
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null)
  const [bannerCrop, setBannerCrop] = useState({ x: 0, y: 0 })
  const [bannerZoom, setBannerZoom] = useState(1)
  const [bannerCroppedArea, setBannerCroppedArea] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const [initialSnapshot, setInitialSnapshot] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 種別ごとの所属情報キャッシュ（種別切り替え時に退避・復元）
  const enrollmentCacheRef = useRef<Partial<Record<string, EnrollmentCache>>>({})

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
            gender: data.visibility?.gender ?? "internal",
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
          const currentEnrollment = data.enrollments?.find((e: { isCurrent?: boolean }) => e.isCurrent)
          setFaculty(currentEnrollment?.faculty ?? "")
          setAdmissionYear(currentEnrollment?.admissionYear ?? "")
          setEnrollmentType((currentEnrollment?.enrollmentType as EnrollmentType) ?? "")
          setTransferYear(currentEnrollment?.transferYear ?? "")
          setGraduationYear(currentEnrollment?.graduationYear ?? "")
          const undergradEnrollment = data.enrollments?.find((e: { isCurrent?: boolean }) => !e.isCurrent)
          if (data.memberType === "院生" || (data.memberType === "卒業生" && (GRADUATE_SCHOOLS as readonly string[]).includes(currentEnrollment?.faculty ?? ""))) {
            if (undergradEnrollment) {
              setHasUndergrad(true)
              setUndergradFaculty(undergradEnrollment.faculty ?? "")
              setUndergradAdmissionYear(undergradEnrollment.admissionYear ?? "")
              setUndergradEnrollmentType((undergradEnrollment.enrollmentType as EnrollmentType) ?? "")
              setUndergradTransferYear(undergradEnrollment.transferYear ?? "")
            } else if (data.enrollments?.length > 0) {
              setHasUndergrad(false)
            }
          }
          const fiscalYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
          setYear(data.yearByFiscal?.[String(fiscalYear)] ?? "")
          setRole(data.role ?? "")
          if (data.discordId) setDiscordId(data.discordId)
          if (data.discordAvatar) setDiscordAvatarHash(data.discordAvatar)
          if (data.lineAvatar) setLineAvatar(data.lineAvatar)
          setLineLinked(!!data.lineId)
          if (data.githubAvatar) setGithubAvatar(data.githubAvatar)
          if (data.xAvatar) setXAvatar(data.xAvatar)
          if (data.linkedin) setLinkedinUrl(data.linkedin)
          if (data.faceImage) setFaceImageUrl(data.faceImage)
          if (data.bannerImage) setBannerImageUrl(data.bannerImage)
          if (data.primaryAvatar) setPrimaryAvatar(data.primaryAvatar)
          if (data.ringColor) setRingColor(data.ringColor)
          if (data.memberType && (MEMBER_TYPES as readonly string[]).includes(data.memberType)) setMemberType(data.memberType as MemberType)
          if (data.currentOrg) setCurrentOrg(data.currentOrg)
          if (data.interests) setInterests(data.interests)
          if (data.topInterests) setTopInterests(data.topInterests)
          const loadedProfile: Profile = {
            studentId: data.studentId ?? "",
            nickname: data.nickname ?? "",
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            lastNameRomaji: data.lastNameRomaji ?? "",
            firstNameRomaji: data.firstNameRomaji ?? "",
            bio: data.bio ?? "",
            birthDate: data.birthDate ?? "",
            gender: data.gender ?? "",
            currentOrg: data.currentOrg ?? "",
            line: data.line ?? "",
            discord: data.discordUsername ?? "",
            github: data.github ?? "",
            x: data.x ?? "",
            visibility: vis,
          }
          setProfile(loadedProfile)
          setInitialSnapshot(JSON.stringify({
            profile: loadedProfile,
            allowPublic: typeof data.allowPublic === "boolean" ? data.allowPublic : !!(VISIBILITY_FIELD_KEYS.some((k) => vis[k] === "public")),
            primaryAvatar: data.primaryAvatar ?? "face",
            ringColor: data.ringColor ?? DEFAULT_RING_COLOR,
            interests: data.interests ?? [],
            topInterests: data.topInterests ?? [],
            memberType: data.memberType ?? "",
            currentOrg: data.currentOrg ?? "",
            year: data.yearByFiscal?.[String(fiscalYear)] ?? "",
            faculty: currentEnrollment?.faculty ?? "",
            admissionYear: currentEnrollment?.admissionYear ?? "",
            enrollmentType: currentEnrollment?.enrollmentType ?? "",
            transferYear: currentEnrollment?.transferYear ?? "",
            graduationYear: currentEnrollment?.graduationYear ?? "",
            hasUndergrad: (data.memberType === "院生" || (data.memberType === "卒業生" && (GRADUATE_SCHOOLS as readonly string[]).includes(currentEnrollment?.faculty ?? "")))
              ? (undergradEnrollment ? true : (data.enrollments?.length > 0 ? false : null))
              : null,
            undergradFaculty: undergradEnrollment?.faculty ?? "",
            undergradAdmissionYear: undergradEnrollment?.admissionYear ?? "",
            undergradEnrollmentType: undergradEnrollment?.enrollmentType ?? "",
            undergradTransferYear: undergradEnrollment?.transferYear ?? "",
          }))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const currentSnapshot = useMemo(() =>
    JSON.stringify({ profile, allowPublic, primaryAvatar, ringColor, interests, topInterests, memberType, currentOrg, year, faculty, admissionYear, enrollmentType, transferYear, graduationYear, hasUndergrad, undergradFaculty, undergradAdmissionYear, undergradEnrollmentType, undergradTransferYear }),
    [profile, allowPublic, primaryAvatar, ringColor, interests, topInterests, memberType, currentOrg, year, faculty, admissionYear, enrollmentType, transferYear, graduationYear, hasUndergrad, undergradFaculty, undergradAdmissionYear, undergradEnrollmentType, undergradTransferYear]
  )

  const isDirty = !loading && initialSnapshot !== "" && currentSnapshot !== initialSnapshot

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const handleReset = useCallback(() => {
    if (!initialSnapshot) return
    const snap = JSON.parse(initialSnapshot)
    setProfile(snap.profile)
    setAllowPublic(snap.allowPublic)
    setPrimaryAvatar(snap.primaryAvatar)
    setRingColor(snap.ringColor)
    setInterests(snap.interests)
    setTopInterests(snap.topInterests)
    setMemberType(snap.memberType)
    setCurrentOrg(snap.currentOrg)
    setYear(snap.year)
    setFaculty(snap.faculty)
    setAdmissionYear(snap.admissionYear)
    setEnrollmentType(snap.enrollmentType)
    setTransferYear(snap.transferYear)
    setGraduationYear(snap.graduationYear)
    setHasUndergrad(snap.hasUndergrad)
    setUndergradFaculty(snap.undergradFaculty)
    setUndergradAdmissionYear(snap.undergradAdmissionYear)
    setUndergradEnrollmentType(snap.undergradEnrollmentType)
    setUndergradTransferYear(snap.undergradTransferYear)
    enrollmentCacheRef.current = {}
  }, [initialSnapshot])

  const handlePublish = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          allowPublic,
          primaryAvatar,
          ringColor,
          interests,
          topInterests,
          memberType,
          currentOrg: memberType === "卒業生" ? currentOrg : "",
          ...(memberType !== "卒業生" && year ? {
            yearByFiscal: { [String(new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1)]: year },
          } : {}),
          ...(() => {
            const entries = [
              ...(faculty ? [{
                faculty,
                admissionYear,
                enrollmentType: enrollmentType || "入学",
                ...(transferYear ? { transferYear } : {}),
                ...(graduationYear ? { graduationYear } : {}),
                isCurrent: true,
              }] : []),
              ...((memberType === "院生" || (memberType === "卒業生" && (GRADUATE_SCHOOLS as readonly string[]).includes(faculty))) && hasUndergrad && undergradFaculty ? [{
                faculty: undergradFaculty,
                admissionYear: undergradAdmissionYear,
                enrollmentType: undergradEnrollmentType || "入学",
                ...(undergradTransferYear ? { transferYear: undergradTransferYear } : {}),
                isCurrent: false,
              }] : []),
            ]
            return entries.length > 0 ? { enrollments: entries } : {}
          })(),
        }),
      })

      if (response.ok) {
        setInitialSnapshot(currentSnapshot)
        setSaved(true)
        setTimeout(() => setSaved(false), 4000)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        toast({ variant: "destructive", title: "保存に失敗しました", description: "もう一度お試しください。" })
      }
    } catch (error) {
      console.error("エラーが発生しました: ", error)
      toast({ variant: "destructive", title: "エラーが発生しました", description: "もう一度お試しください。" })
    } finally {
      setSaving(false)
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
        setBlobAnimating(true)
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

  const handleBannerFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    const reader = new FileReader()
    reader.onload = () => {
      setBannerCropSrc(reader.result as string)
      setBannerCrop({ x: 0, y: 0 })
      setBannerZoom(1)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleBannerCropConfirm = useCallback(async () => {
    if (!bannerCropSrc || !bannerCroppedArea) return
    setBannerUploading(true)
    try {
      const blob = await cropAndResizeImage(bannerCropSrc, bannerCroppedArea, { maxSize: 1200 })
      const formData = new FormData()
      formData.append("image", blob, "banner.webp")
      formData.append("type", "banner")
      const res = await fetch("/api/profile/image", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setBannerImageUrl(url)
        setBannerCropSrc(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({
          variant: "destructive",
          title: "バナー画像のアップロードに失敗しました",
          description: data.error || "しばらく経ってから再度お試しください。",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "バナー画像のアップロードに失敗しました",
        description: "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
      })
    } finally {
      setBannerUploading(false)
    }
  }, [bannerCropSrc, bannerCroppedArea])

  const handleBannerRemove = useCallback(async () => {
    setBannerUploading(true)
    try {
      const res = await fetch("/api/profile/image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "banner" }),
      })
      if (res.ok) {
        setBannerImageUrl("")
      } else {
        toast({
          variant: "destructive",
          title: "バナー画像の削除に失敗しました",
          description: "しばらく経ってから再度お試しください。",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "バナー画像の削除に失敗しました",
        description: "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
      })
    } finally {
      setBannerUploading(false)
    }
  }, [])

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
    return { main, sub, department: dept, image: mainImage, snsAvatar: discordAvatarUrl !== "/placeholder.svg" ? discordAvatarUrl : undefined }
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
    switch (primaryAvatar) {
      case "face":
        image = faceImageUrl || "/assets/avatar-placeholder.svg"
        break
      case "discord":
        image = discordAvatarUrl !== "/placeholder.svg" ? discordAvatarUrl : "/assets/avatar-placeholder.svg"
        break
      case "line":
        image = lineAvatar || "/assets/avatar-placeholder.svg"
        break
      default:
        image = "/assets/avatar-placeholder.svg"
    }
    return { main, sub, role, department: dept, year, image }
  }, [profile, faculty, year, role, faceImageUrl, primaryAvatar, discordAvatarUrl, lineAvatar, getInitials])

  const buildSnsEntries = useCallback((level: "public" | "internal") => {
    const v = profile.visibility
    const check = level === "public" ? (l: string) => l === "public" : (l: string) => l !== "private"
    const entries: SnsEntry[] = []
    if (check(v.discord) && profile.discord)
      entries.push({ platform: "discord", username: profile.discord, url: `https://discord.com/users/${discordId}`, avatarUrl: discordAvatarUrl !== "/placeholder.svg" ? discordAvatarUrl : undefined })
    if (check(v.line) && profile.line)
      entries.push({ platform: "line", username: profile.line, avatarUrl: lineAvatar || undefined })
    if (check(v.github) && profile.github)
      entries.push({ platform: "github", username: profile.github, url: `https://github.com/${profile.github}`, avatarUrl: githubAvatar || undefined })
    if (check(v.x) && profile.x)
      entries.push({ platform: "x", username: profile.x, url: `https://x.com/${profile.x}`, avatarUrl: xAvatar || undefined })
    if (check(v.linkedin) && linkedinUrl) {
      const rawVanity = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] ?? "LinkedIn"
      const vanity = decodeURIComponent(rawVanity)
      entries.push({ platform: "linkedin", username: vanity, url: linkedinUrl })
    }
    return entries
  }, [profile, discordId, githubAvatar, xAvatar, discordAvatarUrl, lineAvatar, linkedinUrl])

  const internalSns = useMemo(() => buildSnsEntries("internal"), [buildSnsEntries])
  const externalSns = useMemo(() => buildSnsEntries("public"), [buildSnsEntries])

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <div className="text-2xl font-semibold">プロフィール編集</div>
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/30 px-4 py-2.5 text-sm text-green-700 dark:text-green-400 animate-[fadeInUp_300ms_ease_both]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              全ての変更が保存されました
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* プロフィール画像セクション */}
            <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <Label className="text-base font-semibold">プロフィール画像</Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-shrink-0 flex items-center justify-center overflow-visible" style={{ width: 136, height: 136 }}>
                  {blobAnimating && (
                    <LiquidSplashEffect width={136} height={136} onComplete={() => setBlobAnimating(false)} />
                  )}
                  <div className={`w-24 h-24 relative rounded-full overflow-hidden ring-4 ${getRingColorClass(ringColor)} z-10 ${blobAnimating ? "animate-liquid-pop" : ""}`}>
                    <Image
                      src={faceImageUrl || "/placeholder.svg"}
                      alt="プロフィール画像"
                      fill
                      className="object-cover"
                    />
                  </div>
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

          {/* バナー画像セクション */}
            <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <Label className="text-base font-semibold">バナー画像</Label>
              <p className="text-xs text-muted-foreground">プロフィールカード上部に表示される背景画像です。未設定の場合はグラデーションが表示されます。</p>
              <div className="relative h-28 rounded-xl overflow-hidden">
                {bannerImageUrl ? (
                  <Image
                    src={bannerImageUrl}
                    alt="バナー画像"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-primary" />
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={bannerUploading}
                >
                  {bannerUploading ? "アップロード中..." : "画像を選択"}
                </Button>
                {bannerImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBannerRemove}
                    disabled={bannerUploading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40"
                  >
                    削除
                  </Button>
                )}
              </div>

              {/* Banner Crop UI */}
              {bannerCropSrc && (
                <div className="space-y-3">
                  <div className="relative w-full" style={{ height: 200 }}>
                    <Cropper
                      image={bannerCropSrc}
                      crop={bannerCrop}
                      zoom={bannerZoom}
                      aspect={16 / 5}
                      onCropChange={setBannerCrop}
                      onZoomChange={setBannerZoom}
                      onCropComplete={(_, area) => setBannerCroppedArea(area)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex-shrink-0">ズーム</span>
                    <input type="range" min={1} max={3} step={0.1} value={bannerZoom} onChange={(e) => setBannerZoom(Number(e.target.value))} className="flex-1" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="ghost" size="sm" onClick={() => setBannerCropSrc(null)}>キャンセル</Button>
                    <Button size="sm" onClick={handleBannerCropConfirm} disabled={bannerUploading}>{bannerUploading ? "アップロード中..." : "切り抜き"}</Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">興味分野</Label>
              <InterestTagInput
                value={interests}
                onChange={setInterests}
                topInterests={topInterests}
                onTopInterestsChange={setTopInterests}
              />
            </div>

            {/* 所属情報セクション */}
            <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <Label className="text-base font-semibold">所属情報</Label>

              {/* 種別 */}
              <div className="space-y-1.5">
                <Label>種別</Label>
                <div className="flex gap-2 flex-wrap">
                  {MEMBER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        if (type === memberType) return
                        // 現在の種別の情報をキャッシュに退避
                        if (memberType) {
                          enrollmentCacheRef.current[memberType] = {
                            year, faculty, admissionYear, enrollmentType, transferYear,
                            graduationYear, currentOrg,
                            hasUndergrad, undergradFaculty, undergradAdmissionYear,
                            undergradEnrollmentType, undergradTransferYear,
                          }
                        }
                        // キャッシュから復元、なければ空
                        const cached = enrollmentCacheRef.current[type]
                        setMemberType(type)
                        setYear(cached?.year ?? "")
                        setFaculty(cached?.faculty ?? "")
                        setAdmissionYear(cached?.admissionYear ?? "")
                        setEnrollmentType(cached?.enrollmentType ?? "")
                        setTransferYear(cached?.transferYear ?? "")
                        setGraduationYear(cached?.graduationYear ?? "")
                        setCurrentOrg(cached?.currentOrg ?? "")
                        setProfile((p) => ({ ...p, currentOrg: cached?.currentOrg ?? "" }))
                        setHasUndergrad(cached?.hasUndergrad ?? null)
                        setUndergradFaculty(cached?.undergradFaculty ?? "")
                        setUndergradAdmissionYear(cached?.undergradAdmissionYear ?? "")
                        setUndergradEnrollmentType(cached?.undergradEnrollmentType ?? "")
                        setUndergradTransferYear(cached?.undergradTransferYear ?? "")
                      }}
                      className={[
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                        memberType === type
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 学籍番号（卒業生以外） */}
              {memberType && memberType !== "卒業生" && (
                <div className="space-y-1.5">
                  <Label>学籍番号</Label>
                  <Input
                    value={profile.studentId}
                    onChange={(e) => setProfile({ ...profile, studentId: e.target.value.toUpperCase() })}
                    placeholder="2164078 / 24HJ078"
                  />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    非公開
                  </span>
                </div>
              )}

              {/* 学年 */}
              {memberType && memberType !== "卒業生" && (() => {
                const { label, note, options } = getSchoolYearOptions(memberType)
                const now = new Date()
                const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
                return (
                  <div className="space-y-1.5">
                    <Label>{fiscalYear}年度での{label}</Label>
                    {note && <p className="text-xs text-muted-foreground">{note}</p>}
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100 border-input dark:border-gray-700"
                    >
                      <option value="">選択してください</option>
                      {options.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )
              })()}

              {/* 学部/学府 */}
              {memberType && (() => {
                const { label, options } = getFacultyOptions(memberType)
                return (
                  <div className="space-y-1.5">
                    <Label>{label}</Label>
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100 border-input dark:border-gray-700"
                    >
                      <option value="">選択してください</option>
                      {options.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                )
              })()}

              {/* 入学年度 + 入学/編入 */}
              {memberType && (
                <div className="space-y-1.5">
                  <Label>{memberType === "院生" ? "横浜国立大学大学院への入学年度" : "横浜国立大学への入学年度"}</Label>
                  <div className="flex gap-2">
                    <select
                      value={admissionYear}
                      onChange={(e) => setAdmissionYear(e.target.value)}
                      className="flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100 border-input dark:border-gray-700"
                    >
                      <option value="">年度を選択</option>
                      {ADMISSION_YEARS.map((y) => (
                        <option key={y} value={y}>{y}年度</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {ENROLLMENT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setEnrollmentType(type)
                            setTransferYear(type === "編入" ? "3" : "")
                          }}
                          className={[
                            "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                            enrollmentType === type
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                          ].join(" ")}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 編入年次 */}
              {enrollmentType === "編入" && (
                <div className="flex items-center gap-3">
                  <Label className="whitespace-nowrap text-sm">編入年次</Label>
                  <div className="flex gap-2">
                    {["2", "3", "4"].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setTransferYear(y)}
                        className={[
                          "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                          transferYear === y
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                        ].join(" ")}
                      >
                        {y}年
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 卒業生のみ：卒業年度 */}
              {memberType === "卒業生" && (
                <div className="space-y-1.5">
                  <Label>卒業年度</Label>
                  <select
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100 border-input dark:border-gray-700"
                  >
                    <option value="">年度を選択</option>
                    {ADMISSION_YEARS.map((y) => (
                      <option key={y} value={y}>{y}年度</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 院生 or 卒業生（学府卒）：学部進学確認 + 学部時代の情報 */}
              {(memberType === "院生" || (memberType === "卒業生" && (GRADUATE_SCHOOLS as readonly string[]).includes(faculty))) && (
                <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>{memberType === "院生" ? "学部から進学しましたか？" : "学部に在籍しましたか？"}</Label>
                    <div className="flex gap-2">
                      {([true, false] as const).map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => {
                            setHasUndergrad(val)
                            if (!val) {
                              setUndergradFaculty("")
                              setUndergradAdmissionYear("")
                              setUndergradEnrollmentType("")
                              setUndergradTransferYear("")
                            }
                          }}
                          className={[
                            "px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                            hasUndergrad === val
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                          ].join(" ")}
                        >
                          {val ? "はい" : "いいえ"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasUndergrad === true && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">学部での所属</p>

                      <div className="space-y-1.5">
                        <Label>所属学部</Label>
                        <select
                          value={undergradFaculty}
                          onChange={(e) => setUndergradFaculty(e.target.value)}
                          className="block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100 border-input dark:border-gray-700"
                        >
                          <option value="">選択してください</option>
                          {FACULTIES.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>学部への入学年度</Label>
                        <div className="flex gap-2">
                          <select
                            value={undergradAdmissionYear}
                            onChange={(e) => setUndergradAdmissionYear(e.target.value)}
                            className="flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100 border-input dark:border-gray-700"
                          >
                            <option value="">年度を選択</option>
                            {ADMISSION_YEARS.map((y) => (
                              <option key={y} value={y}>{y}年度</option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            {ENROLLMENT_TYPES.map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setUndergradEnrollmentType(type)
                                  setUndergradTransferYear(type === "編入" ? "3" : "")
                                }}
                                className={[
                                  "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                                  undergradEnrollmentType === type
                                    ? "bg-purple-600 text-white border-purple-600"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                                ].join(" ")}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {undergradEnrollmentType === "編入" && (
                        <div className="flex items-center gap-3">
                          <Label className="whitespace-nowrap text-sm">編入年次</Label>
                          <div className="flex gap-2">
                            {["2", "3", "4"].map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => setUndergradTransferYear(y)}
                                className={[
                                  "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                                  undergradTransferYear === y
                                    ? "bg-purple-600 text-white border-purple-600"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                                ].join(" ")}
                              >
                                {y}年
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PROFILE_FIELDS.map((key) => {
                if (key === "currentOrg" && memberType !== "卒業生") return null
                const isSns = SNS_FIELDS.has(key)
                return (
                  <div
                    key={key}
                    className={key === "bio" ? "md:col-span-2 space-y-2" : "space-y-2"}
                  >
                    {key !== "bio" && (
                      <div className="flex items-center justify-between">
                        <Label>{FIELD_LABELS[key]}</Label>
                      </div>
                    )}

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
                      <MarkdownEditor
                        value={profile.bio}
                        onChange={(val) => setProfile({ ...profile, bio: val })}
                        height={200}
                        placeholder={"経営学部3年の山田です！\n\n**趣味**\n- カラオケ 🎤（ヒトカラも全然いく派）\n- 筋トレ 💪（最近ベンチプレス60kg達成しました）\n- Netflix（おすすめあったら教えてください！）\n\n最近友達とWeb開発や機械学習の勉強を始めました！いろいろ作ってみたいです、よろしくお願いします！"}
                      />
                    ) : key === "birthDate" ? (
                      <Input
                        type="date"
                        value={profile.birthDate ?? ""}
                        onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                        className="block w-full"
                      />
                    ) : key === "gender" ? (
                      <Select
                        value={profile.gender ?? ""}
                        onValueChange={(v) => setProfile({ ...profile, gender: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        onChange={(e) => {
                          setProfile({ ...profile, [key]: e.target.value })
                          if (key === "currentOrg") setCurrentOrg(e.target.value)
                        }}
                        placeholder={key === "currentOrg" ? "例: 株式会社〇〇" : `${FIELD_LABELS[key]}を入力してください`}
                      />
                    )}

                    {(key === "lastNameRomaji" || key === "firstNameRomaji") && (
                      <p className="text-xs text-gray-400">イニシャル表示に使用されます</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 公開設定セクション（一箇所にまとめる） */}
            <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800/60 p-4 space-y-4 mt-2">
              <div>
                <h3 className="text-base font-semibold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">公開設定</h3>
                <p className="text-xs text-muted-foreground mt-0.5">各情報を誰に公開するか設定してください。</p>
              </div>

              {/* 公開レベルの説明 */}
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

              {/* HP掲載トグル */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const next = !allowPublic
                  setAllowPublic(next)
                  if (next) {
                    // ONに戻す: 各フィールドを制約に応じた最大レベルに設定
                    setProfile((prev) => {
                      const vis = { ...prev.visibility }
                      const internalOnly = new Set(["line", "birthDate"])
                      for (const k of VISIBILITY_FIELD_KEYS) {
                        vis[k] = internalOnly.has(k) ? "internal" : "public"
                      }
                      return { ...prev, visibility: vis }
                    })
                  } else {
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
                  "w-full flex items-center justify-between gap-3 rounded-xl border-2 px-3 sm:px-4 py-3 transition-all duration-200 cursor-pointer select-none",
                  allowPublic
                    ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className={["font-semibold text-sm", allowPublic ? "text-green-800 dark:text-green-300" : "text-gray-700 dark:text-gray-300"].join(" ")}>
                    HPにメンバー情報を掲載する
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {allowPublic ? "外部公開が選択できます" : "外部公開は無効になります（ログインメンバーのみ閲覧可）"}
                  </p>
                </div>
                <div className={[
                  "w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 relative",
                  allowPublic ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-gray-300 dark:bg-gray-600",
                ].join(" ")}>
                  <span className={[
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    allowPublic ? "translate-x-5" : "translate-x-0.5",
                  ].join(" ")} />
                </div>
              </div>

              {/* フィールド別の公開設定リスト */}
              <div className="space-y-1">
                <div className="flex justify-end gap-6 text-xs text-gray-400 dark:text-gray-500 pr-1">
                  <span>非公開</span>
                  <span>内部のみ</span>
                  <span className={allowPublic ? "" : "opacity-30"}>外部公開</span>
                </div>
                {VISIBILITY_DISPLAY_KEYS.map((key) => {
                  if (key === "currentOrg" && memberType !== "卒業生") return null
                  const isCombinedName = key === "lastName"
                  const visibilityValue = isCombinedName
                    ? (profile.visibility.lastName === profile.visibility.firstName
                        ? profile.visibility.lastName
                        : "internal")
                    : (profile.visibility[key as keyof typeof profile.visibility] ?? "private")
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 shrink-1">
                        {VISIBILITY_LABELS[key]}
                      </span>
                      <VisibilityToggle
                        value={visibilityValue}
                        onChange={(v: VisibilityLevel) =>
                          setProfile({
                            ...profile,
                            visibility: isCombinedName
                              ? { ...profile.visibility, lastName: v, firstName: v }
                              : { ...profile.visibility, [key]: v },
                          })
                        }
                        max={key === "line" || key === "birthDate" || !allowPublic ? "internal" : undefined}
                        min={key === "line" || key === "discord" ? "internal" : undefined}
                      />
                    </div>
                  )
                })}
              </div>

              {/* PC用プレビュー（折りたたみ） */}
              <div className="hidden sm:block">
                <button
                  onClick={() => setShowPreview(p => !p)}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  {showPreview ? "▼ プレビューを閉じる" : "▶ プレビューを見る"}
                </button>
                {showPreview && (
                  <div className="mt-3">
                    <MemberPreviewToggle
                      internalData={{ ...internalPreview, ringColor, memberType, currentOrg, role, year, bio: profile.bio, sns: internalSns, topInterests, interests }}
                      externalData={{ ...externalPreview, ringColor, memberType, currentOrg, bio: profile.bio, sns: externalSns, topInterests, interests }}
                      allowPublic={allowPublic}
                    />
                  </div>
                )}
              </div>
            </div>
        </CardContent>
      </Card>

      {/* フローティング保存バー */}
      <div
        className={`fixed bottom-0 right-0 z-40 transition-all duration-300 ${isDirty ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
        style={{ left: isMobile ? 0 : `var(--sidebar-width${sidebarState === "collapsed" ? "-icon" : ""})` }}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6 pb-4">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 px-5 py-3 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2.5 text-sm text-gray-200">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-white text-xs font-bold shrink-0">!</span>
              未保存の変更があります
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10" onClick={handleReset}>
                リセット
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]">
                {saving ? (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-[pulse_1s_ease_0ms_infinite]" />
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-[pulse_1s_ease_150ms_infinite]" />
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-[pulse_1s_ease_300ms_infinite]" />
                  </span>
                ) : "変更を保存"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* スマホ用フローティングプレビューボタン */}
      <button
        onClick={() => setShowPreview(p => !p)}
        className={`sm:hidden fixed right-6 z-50 rounded-full bg-purple-600 text-white shadow-lg flex items-center gap-2 px-4 py-3 hover:bg-purple-700 active:scale-95 transition-all ${isDirty ? "bottom-20" : "bottom-6"}`}
        aria-label="プレビュー切り替え"
      >
        {showPreview ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            <span className="text-sm font-medium">編集に戻る</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="text-sm font-medium">プレビュー</span>
          </>
        )}
      </button>

      {/* スマホ用プレビューオーバーレイ */}
      {showPreview && (
        <div className="sm:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm overflow-y-auto p-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">プレビュー</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>閉じる</Button>
          </div>
          <MemberPreviewToggle
            internalData={{ ...internalPreview, ringColor, memberType, currentOrg, role, year, bio: profile.bio, sns: internalSns, topInterests, interests }}
            externalData={{ ...externalPreview, ringColor, memberType, currentOrg, bio: profile.bio, sns: externalSns, topInterests, interests }}
            allowPublic={allowPublic}
          />
        </div>
      )}
    </>
  )
}
