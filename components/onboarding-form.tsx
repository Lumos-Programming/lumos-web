"use client"

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VisibilityToggle } from "@/components/ui/visibility-toggle"
import { MEMBER_TYPES, ENROLLMENT_TYPES, ADMISSION_YEARS, FACULTIES, getFacultyOptions } from "@/types/profile"
import type { MemberType, EnrollmentType } from "@/types/profile"
import type { VisibilityLevel } from "@/types/profile"

interface FormData {
  // Step 1
  lastName: string
  firstName: string
  studentId: string
  birthDate: string
  nickname: string
  // Step 2
  memberType: MemberType | ""
  schoolYear: string        // 今年の学年
  faculty: string           // 現在の所属（学府 or 学部）
  admissionYear: string
  enrollmentType: EnrollmentType | ""
  transferYear: string
  // 院生のみ：学部時代の情報
  hasUndergrad: boolean | null   // null=未選択
  undergradFaculty: string
  undergradAdmissionYear: string
  undergradEnrollmentType: EnrollmentType | ""
  undergradTransferYear: string
  currentOrg: string        // 卒業生のみ
  // Step 4
  bio: string
}

interface VisibilityForm {
  lastName: VisibilityLevel
  firstName: VisibilityLevel
  faculty: VisibilityLevel
  currentOrg: VisibilityLevel
  birthDate: VisibilityLevel
  nickname: VisibilityLevel
  bio: VisibilityLevel
  github: VisibilityLevel
  x: VisibilityLevel
  linkedin: VisibilityLevel
  line: VisibilityLevel
  discord: VisibilityLevel
}

const DEFAULT_FORM: FormData = {
  lastName: "",
  firstName: "",
  studentId: "",
  birthDate: "",
  nickname: "",
  memberType: "",
  schoolYear: "",
  faculty: "",
  admissionYear: "",
  enrollmentType: "",
  transferYear: "",
  hasUndergrad: null,
  undergradFaculty: "",
  undergradAdmissionYear: "",
  undergradEnrollmentType: "",
  undergradTransferYear: "",
  currentOrg: "",
  bio: "",
}

const DEFAULT_VISIBILITY: VisibilityForm = {
  lastName: "public",
  firstName: "public",
  faculty: "public",
  currentOrg: "public",
  birthDate: "internal",
  nickname: "public",
  bio: "public",
  github: "public",
  x: "public",
  linkedin: "public",
  line: "internal",
  discord: "public",
}

const VISIBILITY_LABELS: Record<keyof VisibilityForm, string> = {
  lastName: "姓・名",
  firstName: "名",
  faculty: "学部/学府",
  currentOrg: "現在の所属",
  birthDate: "誕生日",
  nickname: "ニックネーム",
  bio: "自己紹介",
  github: "GitHub",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  line: "LINE",
  discord: "Discord",
}

const VISIBILITY_DISPLAY_KEYS: Array<keyof VisibilityForm> = [
  "lastName", "faculty", "currentOrg", "birthDate", "nickname", "bio", "github", "x", "linkedin", "line", "discord",
]

function getSchoolYearOptions(memberType: MemberType | ""): { label: string; note?: string } & { options: string[] } {
  switch (memberType) {
    case "学部生":
      return { label: "学年", options: ["学部1年", "学部2年", "学部3年", "学部4年"] }
    case "院生":
      return { label: "学年", options: ["修士1年", "修士2年", "博士1年", "博士2年", "博士3年"] }
    case "聴講生":
      return { label: "学年", note: "在籍した年数を選択してください", options: ["1年", "2年", "3年", "4年", "5年", "6年"] }
    default:
      return { label: "学年", options: [] }
  }
}

const FIELD_WEIGHTS: Partial<Record<keyof FormData | "line" | "github" | "x" | "visibility" | "faceImage", number>> = {
  lastName: 8,
  firstName: 8,
  studentId: 8,
  birthDate: 4,
  memberType: 8,
  faculty: 8,
  admissionYear: 4,
  enrollmentType: 4,
  nickname: 4,
  bio: 12,
  line: 8,
  github: 4,
  x: 4,
  visibility: 8,   // Step 5 完了
  faceImage: 10,    // Step 6 画像設定
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.731-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx={12} cy={12} r={10} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  )
}

const STEP_LABELS = ["基本情報", "所属情報", "SNS連携", "自己紹介", "公開設定", "画像"]

export default function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialStep = (() => {
    const s = parseInt(searchParams.get("step") ?? "1", 10)
    return s >= 1 && s <= 6 ? s : 1
  })()

  const [showWelcome, setShowWelcome] = useState(
    !searchParams.get("step") && !searchParams.get("success") && !searchParams.get("error")
  )
  const [welcomeFading, setWelcomeFading] = useState(false)
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [allowPublic, setAllowPublic] = useState(true)
  const [visibility, setVisibility] = useState<VisibilityForm>(DEFAULT_VISIBILITY)
  const [lineUsername, setLineUsername] = useState("")
  const [lineLinked, setLineLinked] = useState(false)
  const [lineAvatar, setLineAvatar] = useState("")
  const [githubUsername, setGithubUsername] = useState("")
  const [githubLinked, setGithubLinked] = useState(false)
  const [githubAvatar, setGithubAvatar] = useState("")
  const [xUsername, setXUsername] = useState("")
  const [xLinked, setXLinked] = useState(false)
  const [xAvatar, setXAvatar] = useState("")
  const [linkedinUsername, setLinkedinUsername] = useState("")
  const [linkedinLinked, setLinkedinLinked] = useState(false)
  const [linkedinAvatar, setLinkedinAvatar] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step1Errors, setStep1Errors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [step2Errors, setStep2Errors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [step3Error, setStep3Error] = useState("")
  const [slideAnimating, setSlideAnimating] = useState(false)
  const [discordId, setDiscordId] = useState("")
  const [discordAvatar, setDiscordAvatar] = useState("")
  // Step 6 — image
  const [faceImageUrl, setFaceImageUrl] = useState("")
  const [primaryAvatar, setPrimaryAvatar] = useState<"face" | "discord" | "line" | "default">("face")
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevStepRef = useRef(initialStep)
  const step2CacheKey = "onboarding_step2_cache"
  const step2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveStep2Cache = useCallback((f: FormData) => {
    if (step2TimerRef.current) clearTimeout(step2TimerRef.current)
    step2TimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(step2CacheKey, JSON.stringify({
          memberType: f.memberType,
          schoolYear: f.schoolYear,
          faculty: f.faculty,
          admissionYear: f.admissionYear,
          enrollmentType: f.enrollmentType,
          transferYear: f.transferYear,
          hasUndergrad: f.hasUndergrad,
          undergradFaculty: f.undergradFaculty,
          undergradAdmissionYear: f.undergradAdmissionYear,
          undergradEnrollmentType: f.undergradEnrollmentType,
          undergradTransferYear: f.undergradTransferYear,
          currentOrg: f.currentOrg,
        }))
      } catch { /* localStorage unavailable */ }
    }, 500)
  }, [])

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          type EnrollmentEntry = { isCurrent: boolean; faculty: string; admissionYear: string; enrollmentType: string; transferYear?: string }
          const enrollments: EnrollmentEntry[] = data.enrollments ?? []
          const currentEnrollment = enrollments.find((e) => e.isCurrent)
          const undergradEnrollment = (data.memberType === "院生" || data.memberType === "卒業生")
            ? enrollments.find((e) => !e.isCurrent)
            : undefined
          const hasUndergrad = (data.memberType === "院生" || data.memberType === "卒業生")
            ? (undergradEnrollment ? true : enrollments.length > 0 ? false : null)
            : null

          // localStorage キャッシュで未保存の Step 2 フィールドを補完
          let cache: Partial<FormData> = {}
          try {
            const raw = localStorage.getItem(step2CacheKey)
            if (raw) cache = JSON.parse(raw)
          } catch { /* ignore */ }

          setForm({
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            studentId: data.studentId ?? "",
            birthDate: data.birthDate ?? "",
            nickname: data.nickname ?? "",
            memberType: data.memberType || cache.memberType || "",
            schoolYear: data.yearByFiscal?.[String(new Date().getFullYear())] || cache.schoolYear || "",
            faculty: currentEnrollment?.faculty || cache.faculty || "",
            admissionYear: currentEnrollment?.admissionYear || cache.admissionYear || "",
            enrollmentType: ((currentEnrollment?.enrollmentType || cache.enrollmentType || "") as EnrollmentType | ""),
            transferYear: currentEnrollment?.transferYear || cache.transferYear || "",
            hasUndergrad: hasUndergrad ?? cache.hasUndergrad ?? null,
            undergradFaculty: undergradEnrollment?.faculty || cache.undergradFaculty || "",
            undergradAdmissionYear: undergradEnrollment?.admissionYear || cache.undergradAdmissionYear || "",
            undergradEnrollmentType: ((undergradEnrollment?.enrollmentType || cache.undergradEnrollmentType || "") as EnrollmentType | ""),
            undergradTransferYear: undergradEnrollment?.transferYear || cache.undergradTransferYear || "",
            currentOrg: data.currentOrg || cache.currentOrg || "",
            bio: data.bio ?? "",
          })
          if (typeof data.allowPublic === "boolean") setAllowPublic(data.allowPublic)
          if (data.discordId) setDiscordId(data.discordId)
          if (data.discordAvatar) setDiscordAvatar(data.discordAvatar)
          if (data.faceImage) setFaceImageUrl(data.faceImage)
          if (data.primaryAvatar) setPrimaryAvatar(data.primaryAvatar)
          setLineLinked(!!data.lineId)
          setLineUsername(data.line ?? "")
          setLineAvatar(data.lineAvatar ?? "")
          setGithubLinked(!!data.githubId)
          setGithubUsername(data.github ?? "")
          setGithubAvatar(data.githubAvatar ?? "")
          setXLinked(!!data.xId)
          setXUsername(data.x ?? "")
          setXAvatar(data.xAvatar ?? "")
          setLinkedinLinked(!!data.linkedinId)
          setLinkedinUsername(data.linkedin ?? "")
          setLinkedinAvatar(data.linkedinAvatar ?? "")
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Handle OAuth callback results
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    const stepParam = searchParams.get("step")

    if (success === "line_linked") {
      setLineLinked(true)
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => { if (data?.line) { setLineUsername(data.line); setLineAvatar(data.lineAvatar ?? "") } })
        .catch(console.error)
    } else if (success === "github_linked") {
      setGithubLinked(true)
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => { if (data?.github) { setGithubUsername(data.github); setGithubAvatar(data.githubAvatar ?? "") } })
        .catch(console.error)
    } else if (success === "x_linked") {
      setXLinked(true)
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => { if (data?.x) { setXUsername(data.x); setXAvatar(data.xAvatar ?? "") } })
        .catch(console.error)
    } else if (success === "linkedin_linked") {
      setLinkedinLinked(true)
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => { if (data?.linkedin) { setLinkedinUsername(data.linkedin); setLinkedinAvatar(data.linkedinAvatar ?? "") } })
        .catch(console.error)
    } else if (error === "line_link_failed") {
      setStep3Error("LINE連携に失敗しました。もう一度お試しください。")
    } else if (error === "github_link_failed") {
      setStep3Error("GitHub連携に失敗しました。もう一度お試しください。")
    } else if (error === "x_link_failed") {
      setStep3Error("X連携に失敗しました。もう一度お試しください。")
    } else if (error === "linkedin_link_failed") {
      setStep3Error("LinkedIn連携に失敗しました。もう一度お試しください。")
    }

    if (success || error) {
      const step = stepParam ? parseInt(stepParam, 10) : 3
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      url.searchParams.delete("error")
      router.replace(url.pathname + (step ? `?step=${step}` : ""))
    }
  }, [searchParams, router])

  const saveStep1 = useCallback(async (data: FormData): Promise<boolean> => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: data.studentId,
          lastName: data.lastName,
          firstName: data.firstName,
          nickname: data.nickname,
          birthDate: data.birthDate,
          bio: data.bio,
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
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const goToStep = (next: number) => {
    if (slideAnimating) return
    prevStepRef.current = currentStep
    setSlideAnimating(true)
    setCurrentStep(next)
    router.replace(`?step=${next}`)
    setTimeout(() => setSlideAnimating(false), 400)
  }

  const handleStep1Next = async () => {
    const errors: Partial<Record<keyof FormData, string>> = {}
    if (!form.lastName.trim()) errors.lastName = "姓を入力してください"
    if (!form.firstName.trim()) errors.firstName = "名を入力してください"
    if (!form.studentId.trim()) {
      errors.studentId = "学籍番号を入力してください"
    } else if (!/^\d{2}[A-Z0-9]{2}\d{3}$/.test(form.studentId.trim())) {
      errors.studentId = "学籍番号の形式が正しくありません（例: 2164078 / 24HJ078）"
    }
    setStep1Errors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const ok = await saveStep1(form)
    setSubmitting(false)
    if (!ok) {
      setStep1Errors({ lastName: "保存に失敗しました。もう一度お試しください。" })
      return
    }
    goToStep(2)
  }

  const setFormStep2 = useCallback((updater: (f: FormData) => FormData) => {
    setForm((f) => {
      const next = updater(f)
      saveStep2Cache(next)
      return next
    })
  }, [saveStep2Cache])

  const saveStep2 = useCallback(async (data: FormData): Promise<boolean> => {
    const enrollments = [
      ...(data.faculty ? [{
        faculty: data.faculty,
        admissionYear: data.admissionYear,
        enrollmentType: data.enrollmentType || "入学",
        ...(data.transferYear ? { transferYear: data.transferYear } : {}),
        isCurrent: true,
      }] : []),
      ...((data.memberType === "院生" || data.memberType === "卒業生") && data.hasUndergrad && data.undergradFaculty ? [{
        faculty: data.undergradFaculty,
        admissionYear: data.undergradAdmissionYear,
        enrollmentType: data.undergradEnrollmentType || "入学",
        ...(data.undergradTransferYear ? { transferYear: data.undergradTransferYear } : {}),
        isCurrent: false,
      }] : []),
    ]
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberType: data.memberType,
          yearByFiscal: data.schoolYear ? { [String(new Date().getFullYear())]: data.schoolYear } : undefined,
          currentOrg: data.currentOrg,
          enrollments,
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
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const handleStep2Next = async () => {
    const errors: Partial<Record<keyof FormData, string>> = {}
    if (!form.memberType) errors.memberType = "種別を選択してください"
    if (form.memberType && form.memberType !== "卒業生" && !form.schoolYear) errors.schoolYear = "学年を選択してください"
    if (!form.faculty) errors.faculty = "学部/学府を選択してください"
    if (!form.admissionYear) errors.admissionYear = "入学年度を選択してください"
    // 院生・卒業生で hasUndergrad=true の場合
    if ((form.memberType === "院生" || form.memberType === "卒業生") && form.hasUndergrad === true) {
      if (!form.undergradFaculty) errors.undergradFaculty = "所属学部を選択してください"
      if (!form.undergradAdmissionYear) errors.undergradAdmissionYear = "入学年度を選択してください"
    }
    setStep2Errors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const ok = await saveStep2(form)
    setSubmitting(false)
    if (!ok) {
      setStep2Errors({ faculty: "保存に失敗しました。もう一度お試しください。" })
      return
    }
    try { localStorage.removeItem(step2CacheKey) } catch { /* ignore */ }
    goToStep(3)
  }

  const handleStep3Next = () => {
    if (!lineLinked) {
      setStep3Error("LINEアカウントの連携は必須です")
      return
    }
    setStep3Error("")
    goToStep(4)
  }

  const handleStep4Next = async () => {
    setSubmitting(true)
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: form.bio }),
      })
    } catch { /* ignore — non-blocking */ }
    setSubmitting(false)
    goToStep(5)
  }

  const handleStep5Save = useCallback(async () => {
    // Save visibility settings when leaving step 5
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowPublic,
          visibility: {
            studentId: "private",
            nickname: visibility.nickname,
            lastName: visibility.lastName,
            firstName: visibility.firstName,
            faculty: visibility.faculty,
            currentOrg: visibility.currentOrg,
            birthDate: visibility.birthDate,
            bio: visibility.bio,
            line: visibility.line,
            github: visibility.github,
            x: visibility.x,
            discord: visibility.discord,
          },
        }),
      })
    } catch { /* non-blocking */ }
  }, [allowPublic, visibility])

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropImageSrc(reader.result as string)
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }, [])

  const getCroppedImage = useCallback(async (src: string, pixelCrop: Area): Promise<Blob> => {
    const image = new window.Image()
    image.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = reject
      image.src = src
    })
    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      400,
      400
    )
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/webp",
        0.85
      )
    })
  }, [])

  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return
    setImageUploading(true)
    try {
      const blob = await getCroppedImage(cropImageSrc, croppedAreaPixels)
      const formData = new FormData()
      formData.append("image", blob, "profile.webp")
      const res = await fetch("/api/profile/image", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setFaceImageUrl(url)
        setCropImageSrc(null)
      } else {
        const data = await res.json()
        alert(data.error ?? "アップロードに失敗しました")
      }
    } catch {
      alert("アップロードに失敗しました")
    } finally {
      setImageUploading(false)
    }
  }, [cropImageSrc, croppedAreaPixels, getCroppedImage])

  const handleComplete = async () => {
    setSubmitting(true)
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          lastName: form.lastName,
          firstName: form.firstName,
          nickname: form.nickname,
          birthDate: form.birthDate,
          bio: form.bio,
          allowPublic,
          primaryAvatar,
          visibility: {
            studentId: "private",
            nickname: visibility.nickname,
            lastName: visibility.lastName,
            firstName: visibility.firstName,
            faculty: visibility.faculty,
            currentOrg: visibility.currentOrg,
            birthDate: visibility.birthDate,
            bio: visibility.bio,
            line: visibility.line,
            github: visibility.github,
            x: visibility.x,
            discord: visibility.discord,
          },
        }),
      })
      const res = await fetch("/api/onboarding", { method: "POST" })
      if (res.ok) {
        try { localStorage.removeItem(step2CacheKey) } catch { /* ignore */ }
        router.push("/internal/onboarding/complete")
      } else {
        const data = await res.json()
        alert(data.error ?? "登録に失敗しました。もう一度お試しください。")
      }
    } catch {
      alert("エラーが発生しました。もう一度お試しください。")
    } finally {
      setSubmitting(false)
    }
  }

  // 進捗 % 計算
  // Step 5 完了とみなす（Step 6 に遷移済み = currentStep >= 6）
  const step5Done = currentStep >= 6

  const progressPercent = Math.min(100, (() => {
    let score = 0
    if (form.lastName) score += FIELD_WEIGHTS.lastName ?? 0
    if (form.firstName) score += FIELD_WEIGHTS.firstName ?? 0
    if (form.studentId) score += FIELD_WEIGHTS.studentId ?? 0
    if (form.birthDate) score += FIELD_WEIGHTS.birthDate ?? 0
    if (form.memberType) score += FIELD_WEIGHTS.memberType ?? 0
    if (form.faculty) score += FIELD_WEIGHTS.faculty ?? 0
    if (form.admissionYear) score += FIELD_WEIGHTS.admissionYear ?? 0
    if (form.enrollmentType) score += FIELD_WEIGHTS.enrollmentType ?? 0
    if (form.nickname) score += FIELD_WEIGHTS.nickname ?? 0
    if (form.bio) score += FIELD_WEIGHTS.bio ?? 0
    if (lineLinked) score += FIELD_WEIGHTS.line ?? 0
    if (githubLinked) score += FIELD_WEIGHTS.github ?? 0
    if (xLinked) score += FIELD_WEIGHTS.x ?? 0
    if (step5Done) score += FIELD_WEIGHTS.visibility ?? 0
    if (faceImageUrl) score += FIELD_WEIGHTS.faceImage ?? 0
    return score
  })())


  const dismissWelcome = useCallback(() => {
    setWelcomeFading(true)
    setTimeout(() => {
      setShowWelcome(false)
      setWelcomeFading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (showWelcome) {
    return (
      <div
        className={[
          "fixed inset-0 flex flex-col items-center justify-center bg-[#0d0f1a] overflow-hidden transition-opacity duration-500",
          welcomeFading ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        {/* 浮遊パーティクル */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 pointer-events-none animate-[welcomeFloat_linear_infinite]"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              left: `${10 + i * 11}%`,
              top: `${15 + ((i * 17) % 60)}%`,
              animationDuration: `${6 + i * 1.5}s`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* 背景グロー */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full pointer-events-none animate-[welcomePulse_4s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, rgba(130,120,200,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center w-full max-w-xl px-4">
          {/* ロゴ — spin + scale in */}
          <div className="w-56 h-56 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/25 overflow-hidden p-4 animate-[welcomeLogoIn_1s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            <Image
              src="/assets/lumos_logo-full.png"
              alt="Lumos"
              width={168}
              height={168}
              className="object-contain"
              priority
            />
          </div>

          {/* タイトル — letter by letter fade in */}
          <h1 className="mt-10 text-4xl sm:text-5xl font-bold text-white tracking-tight text-center">
            {"Lumosへようこそ！".split("").map((char, i) => (
              <span
                key={i}
                className="inline-block animate-[welcomeLetterIn_0.4s_ease_both]"
                style={{ animationDelay: `${0.8 + i * 0.06}s` }}
              >
                {char}
              </span>
            ))}
          </h1>

          {/* バッジ — pop in */}
          <div className="mt-6 animate-[welcomeBadgeIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]" style={{ animationDelay: "1.8s" }}>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-[#c8cae0]">
              <svg className="w-4 h-4 text-[#7c7fda]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx={12} cy={12} r={10} />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              3分ほどで基本情報の登録が完了します
            </span>
          </div>

          {/* ボタン — slide up */}
          <div className="mt-10 animate-[welcomeSlideUp_0.6s_ease_both]" style={{ animationDelay: "2.2s" }}>
            <button
              onClick={dismissWelcome}
              className="group inline-flex items-center gap-2 px-10 py-3.5 rounded-full text-base font-semibold text-[#0d0f1a] bg-white hover:bg-gray-100 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-black/25"
            >
              はじめる
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes welcomeFloat {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
            50% { transform: translateY(-40px) scale(1.3); opacity: 0.8; }
          }
          @keyframes welcomePulse {
            0%, 100% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          @keyframes welcomeLogoIn {
            0% { transform: scale(0) rotate(-180deg); opacity: 0; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes welcomeLetterIn {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes welcomeBadgeIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes welcomeSlideUp {
            0% { transform: translateY(24px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-start justify-center pt-8 pb-8 px-4 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-4 gap-2">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1
            const isActive = stepNum === currentStep
            const isDone = stepNum < currentStep
            return (
              <div key={stepNum} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={[
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200/50 dark:shadow-purple-900/50 scale-110"
                        : isDone
                        ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : stepNum}
                  </div>
                  <span
                    className={[
                      "text-[10px] font-medium transition-colors duration-300",
                      isActive ? "text-purple-700 dark:text-purple-300" : isDone ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={[
                      "w-6 h-px mb-5 transition-colors duration-300",
                      stepNum < currentStep ? "bg-green-400 dark:bg-green-600" : "bg-gray-200 dark:bg-gray-700",
                    ].join(" ")}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 進捗バー */}
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{progressPercent}% 完了</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200/70 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Card with active step */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-800/50 overflow-hidden">
          <div>
            {/* Step 1 — 基本情報 */}
            {currentStep === 1 && <div className="p-8">
              <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">ようこそ、Lumosへ</h1>
                <p className="text-muted-foreground mt-1 text-sm">まず、基本的な情報を入力してください。</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 animate-[fadeInUp_300ms_60ms_ease_both]">
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">
                      姓 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                        if (step1Errors.lastName) setStep1Errors((p) => ({ ...p, lastName: undefined }))
                      }}
                      placeholder="山田"
                      className={step1Errors.lastName ? "border-red-400" : ""}
                    />
                    {step1Errors.lastName && <p className="text-xs text-red-500">{step1Errors.lastName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">
                      名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                        if (step1Errors.firstName) setStep1Errors((p) => ({ ...p, firstName: undefined }))
                      }}
                      placeholder="太郎"
                      className={step1Errors.firstName ? "border-red-400" : ""}
                    />
                    {step1Errors.firstName && <p className="text-xs text-red-500">{step1Errors.firstName}</p>}
                  </div>
                </div>

                <div className="space-y-1.5 animate-[fadeInUp_300ms_120ms_ease_both]">
                  <Label htmlFor="studentId">
                    学籍番号 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="studentId"
                    value={form.studentId}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, studentId: e.target.value.toUpperCase() }))
                      if (step1Errors.studentId) setStep1Errors((p) => ({ ...p, studentId: undefined }))
                    }}
                    placeholder="2164078 / 24HJ078"
                    className={step1Errors.studentId ? "border-red-400" : ""}
                  />
                  {step1Errors.studentId && <p className="text-xs text-red-500">{step1Errors.studentId}</p>}
                </div>

                <div className="space-y-1.5 animate-[fadeInUp_300ms_180ms_ease_both]">
                  <Label htmlFor="birthDate">誕生日</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                    className="block w-full"
                  />
                </div>

                <div className="space-y-1.5 animate-[fadeInUp_300ms_240ms_ease_both]">
                  <Label htmlFor="nickname">ニックネーム</Label>
                  <Input
                    id="nickname"
                    value={form.nickname}
                    onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                    placeholder="タロウ"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end animate-[fadeInUp_300ms_300ms_ease_both]">
                <Button onClick={handleStep1Next} disabled={submitting} className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
                  {submitting ? "保存中..." : "次へ →"}
                </Button>
              </div>
            </div>}

            {/* Step 2 — 所属情報 */}
            {currentStep === 2 && <div className="p-8">
              <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">所属情報</h2>
                <p className="text-muted-foreground mt-1 text-sm">所属する学部・学府や入学情報を入力してください。</p>
              </div>

              <div className="space-y-5">
                {/* 種別 */}
                <div className="space-y-1.5 animate-[fadeInUp_300ms_60ms_ease_both]">
                  <Label>
                    種別 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {MEMBER_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormStep2((f) => ({ ...f, memberType: type, schoolYear: "", faculty: "", currentOrg: "" }))
                          setStep2Errors((p) => ({ ...p, memberType: undefined, faculty: undefined }))
                        }}
                        className={[
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                          form.memberType === type
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600"
                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                        ].join(" ")}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {step2Errors.memberType && <p className="text-xs text-red-500">{step2Errors.memberType}</p>}
                </div>

                {/* 学年 */}
                {form.memberType && form.memberType !== "卒業生" && (() => {
                  const { label, note, options } = getSchoolYearOptions(form.memberType)
                  return (
                    <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
                      <Label htmlFor="schoolYear">{new Date().getFullYear()}年度での{label} <span className="text-red-500">*</span></Label>
                      {note && <p className="text-xs text-muted-foreground">{note}</p>}
                      <select
                        id="schoolYear"
                        value={form.schoolYear}
                        onChange={(e) => {
                          setFormStep2((f) => ({ ...f, schoolYear: e.target.value }))
                          if (step2Errors.schoolYear) setStep2Errors((p) => ({ ...p, schoolYear: undefined }))
                        }}
                        className={[
                          "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                          step2Errors.schoolYear ? "border-red-400" : "border-input dark:border-gray-700",
                        ].join(" ")}
                      >
                        <option value="">選択してください</option>
                        {options.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      {step2Errors.schoolYear && <p className="text-xs text-red-500">{step2Errors.schoolYear}</p>}
                    </div>
                  )
                })()}

                {/* 学部/学府 */}
                {form.memberType && (() => {
                  const { label, options } = getFacultyOptions(form.memberType)
                  return (
                    <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
                      <Label htmlFor="faculty">
                        {label} <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="faculty"
                        value={form.faculty}
                        onChange={(e) => {
                          setFormStep2((f) => ({ ...f, faculty: e.target.value }))
                          if (step2Errors.faculty) setStep2Errors((p) => ({ ...p, faculty: undefined }))
                        }}
                        className={[
                          "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                          step2Errors.faculty ? "border-red-400" : "border-input dark:border-gray-700",
                        ].join(" ")}
                      >
                        <option value="">選択してください</option>
                        {options.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      {step2Errors.faculty && <p className="text-xs text-red-500">{step2Errors.faculty}</p>}
                    </div>
                  )
                })()}

                {/* 入学年度 + 入学/編入 */}
                <div className="space-y-1.5 animate-[fadeInUp_300ms_120ms_ease_both]">
                  <Label>{form.memberType === "院生" ? "横浜国立大学大学院への入学年度" : "横浜国立大学への入学年度"} <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <select
                      value={form.admissionYear}
                      onChange={(e) => {
                        setFormStep2((f) => ({ ...f, admissionYear: e.target.value }))
                        if (step2Errors.admissionYear) setStep2Errors((p) => ({ ...p, admissionYear: undefined }))
                      }}
                      className={[
                        "flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                        step2Errors.admissionYear ? "border-red-400" : "border-input dark:border-gray-700",
                      ].join(" ")}
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
                          onClick={() => setFormStep2((f) => ({
                            ...f,
                            enrollmentType: type,
                            transferYear: type === "編入" ? "3" : "",
                          }))}
                          className={[
                            "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                            form.enrollmentType === type
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                          ].join(" ")}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  {step2Errors.admissionYear && <p className="text-xs text-red-500">{step2Errors.admissionYear}</p>}
                </div>

                {/* 編入年次 */}
                {form.enrollmentType === "編入" && (
                  <div className="flex items-center gap-3 animate-[fadeInUp_300ms_ease_both]">
                    <Label className="whitespace-nowrap text-sm">編入年次</Label>
                    <div className="flex gap-2">
                      {["2", "3", "4"].map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setFormStep2((f) => ({ ...f, transferYear: y }))}
                          className={[
                            "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                            form.transferYear === y
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

                {/* 院生のみ：学部進学確認 + 学部時代の情報 */}
                {form.memberType === "院生" && (
                  <div className="space-y-4 animate-[fadeInUp_300ms_ease_both] border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                    <div className="space-y-1.5">
                      <Label>学部から進学しましたか？</Label>
                      <div className="flex gap-2">
                        {([true, false] as const).map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => setFormStep2((f) => ({
                              ...f,
                              hasUndergrad: val,
                              undergradFaculty: val ? f.undergradFaculty : "",
                              undergradAdmissionYear: val ? f.undergradAdmissionYear : "",
                              undergradEnrollmentType: val ? f.undergradEnrollmentType : "",
                              undergradTransferYear: val ? f.undergradTransferYear : "",
                            }))}
                            className={[
                              "px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                              form.hasUndergrad === val
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                            ].join(" ")}
                          >
                            {val ? "はい" : "いいえ"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.hasUndergrad === true && (
                      <div className="space-y-4 animate-[fadeInUp_300ms_ease_both]">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">学部での所属</p>

                        <div className="space-y-1.5">
                          <Label htmlFor="undergradFaculty">所属学部</Label>
                          <select
                            id="undergradFaculty"
                            value={form.undergradFaculty}
                            onChange={(e) => {
                              setFormStep2((f) => ({ ...f, undergradFaculty: e.target.value }))
                              if (step2Errors.undergradFaculty) setStep2Errors((p) => ({ ...p, undergradFaculty: undefined }))
                            }}
                            className={[
                              "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                              step2Errors.undergradFaculty ? "border-red-400" : "border-input dark:border-gray-700",
                            ].join(" ")}
                          >
                            <option value="">選択してください</option>
                            {FACULTIES.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                          {step2Errors.undergradFaculty && <p className="text-xs text-red-500">{step2Errors.undergradFaculty}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <Label>学部への入学年度</Label>
                          <div className="flex gap-2">
                            <select
                              value={form.undergradAdmissionYear}
                              onChange={(e) => {
                                setFormStep2((f) => ({ ...f, undergradAdmissionYear: e.target.value }))
                                if (step2Errors.undergradAdmissionYear) setStep2Errors((p) => ({ ...p, undergradAdmissionYear: undefined }))
                              }}
                              className={[
                                "flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                                step2Errors.undergradAdmissionYear ? "border-red-400" : "border-input dark:border-gray-700",
                              ].join(" ")}
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
                                  onClick={() => setFormStep2((f) => ({
                                    ...f,
                                    undergradEnrollmentType: type,
                                    undergradTransferYear: type === "編入" ? "3" : "",
                                  }))}
                                  className={[
                                    "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                                    form.undergradEnrollmentType === type
                                      ? "bg-purple-600 text-white border-purple-600"
                                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                                  ].join(" ")}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                          {step2Errors.undergradAdmissionYear && <p className="text-xs text-red-500">{step2Errors.undergradAdmissionYear}</p>}
                        </div>

                        {form.undergradEnrollmentType === "編入" && (
                          <div className="flex items-center gap-3 animate-[fadeInUp_300ms_ease_both]">
                            <Label className="whitespace-nowrap text-sm">編入年次</Label>
                            <div className="flex gap-2">
                              {["2", "3", "4"].map((y) => (
                                <button
                                  key={y}
                                  type="button"
                                  onClick={() => setFormStep2((f) => ({ ...f, undergradTransferYear: y }))}
                                  className={[
                                    "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                                    form.undergradTransferYear === y
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

                {/* 卒業生のみ：学部在籍確認 + 学部時代の情報 */}
                {form.memberType === "卒業生" && (
                  <div className="space-y-4 animate-[fadeInUp_300ms_ease_both] border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                    <div className="space-y-1.5">
                      <Label>学部に在籍しましたか？</Label>
                      <div className="flex gap-2">
                        {([true, false] as const).map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => setFormStep2((f) => ({
                              ...f,
                              hasUndergrad: val,
                              undergradFaculty: val ? f.undergradFaculty : "",
                              undergradAdmissionYear: val ? f.undergradAdmissionYear : "",
                              undergradEnrollmentType: val ? f.undergradEnrollmentType : "",
                              undergradTransferYear: val ? f.undergradTransferYear : "",
                            }))}
                            className={[
                              "px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                              form.hasUndergrad === val
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                            ].join(" ")}
                          >
                            {val ? "はい" : "いいえ"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.hasUndergrad === true && (
                      <div className="space-y-4 animate-[fadeInUp_300ms_ease_both]">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">学部での所属</p>

                        <div className="space-y-1.5">
                          <Label htmlFor="undergradFacultyGrad">所属学部</Label>
                          <select
                            id="undergradFacultyGrad"
                            value={form.undergradFaculty}
                            onChange={(e) => {
                              setFormStep2((f) => ({ ...f, undergradFaculty: e.target.value }))
                              if (step2Errors.undergradFaculty) setStep2Errors((p) => ({ ...p, undergradFaculty: undefined }))
                            }}
                            className={[
                              "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                              step2Errors.undergradFaculty ? "border-red-400" : "border-input dark:border-gray-700",
                            ].join(" ")}
                          >
                            <option value="">選択してください</option>
                            {FACULTIES.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                          {step2Errors.undergradFaculty && <p className="text-xs text-red-500">{step2Errors.undergradFaculty}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <Label>学部への入学年度</Label>
                          <div className="flex gap-2">
                            <select
                              value={form.undergradAdmissionYear}
                              onChange={(e) => {
                                setFormStep2((f) => ({ ...f, undergradAdmissionYear: e.target.value }))
                                if (step2Errors.undergradAdmissionYear) setStep2Errors((p) => ({ ...p, undergradAdmissionYear: undefined }))
                              }}
                              className={[
                                "flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                                step2Errors.undergradAdmissionYear ? "border-red-400" : "border-input dark:border-gray-700",
                              ].join(" ")}
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
                                  onClick={() => setFormStep2((f) => ({
                                    ...f,
                                    undergradEnrollmentType: type,
                                    undergradTransferYear: type === "編入" ? "3" : "",
                                  }))}
                                  className={[
                                    "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                                    form.undergradEnrollmentType === type
                                      ? "bg-purple-600 text-white border-purple-600"
                                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                                  ].join(" ")}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                          {step2Errors.undergradAdmissionYear && <p className="text-xs text-red-500">{step2Errors.undergradAdmissionYear}</p>}
                        </div>

                        {form.undergradEnrollmentType === "編入" && (
                          <div className="flex items-center gap-3 animate-[fadeInUp_300ms_ease_both]">
                            <Label className="whitespace-nowrap text-sm">編入年次</Label>
                            <div className="flex gap-2">
                              {["2", "3", "4"].map((y) => (
                                <button
                                  key={y}
                                  type="button"
                                  onClick={() => setFormStep2((f) => ({ ...f, undergradTransferYear: y }))}
                                  className={[
                                    "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                                    form.undergradTransferYear === y
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

                {/* 卒業生のみ：現在の所属 */}
                {form.memberType === "卒業生" && (
                  <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
                    <Label htmlFor="currentOrg">現在の所属</Label>
                    <Input
                      id="currentOrg"
                      value={form.currentOrg}
                      onChange={(e) => setFormStep2((f) => ({ ...f, currentOrg: e.target.value }))}
                      placeholder="例：株式会社〇〇"
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_200ms_ease_both]">
                <Button variant="ghost" onClick={() => goToStep(1)}>
                  ← 戻る
                </Button>
                <Button onClick={handleStep2Next} disabled={submitting} className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
                  {submitting ? "保存中..." : "次へ →"}
                </Button>
              </div>
            </div>}

            {/* Step 3 — SNS連携 */}
            {currentStep === 3 && <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">SNSアカウントを連携</h2>
                <p className="text-muted-foreground mt-1 text-sm">LINEの連携は必須です。GitHubとXは任意です。</p>
              </div>

              <div className="space-y-3">
                {/* LINE — required */}
                <div
                  className={[
                    "rounded-xl border p-4 transition-all duration-300",
                    lineLinked
                      ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
                      : "border-gray-200 dark:border-gray-700",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center w-14 flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center">
                          <LineIcon className="w-5 h-5 text-white" />
                        </div>
                        {lineLinked && lineAvatar && (
                          <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                            <img src={lineAvatar} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 dark:text-gray-100">LINE</span>
                          <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">必須</span>
                        </div>
                        {lineLinked && (
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">@{lineUsername}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href="/api/auth/link/line?redirectTo=/internal/onboarding%3Fstep%3D3"
                      className={[
                        "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                        lineLinked
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                          : "bg-[#06C755] hover:bg-[#05a848] text-white",
                      ].join(" ")}
                    >
                      <LineIcon className="w-3.5 h-3.5" />
                      {lineLinked ? "再連携" : "連携する"}
                    </a>
                  </div>
                </div>

                {/* GitHub — optional */}
                <div
                  className={[
                    "rounded-xl border p-4 transition-all duration-300",
                    githubLinked
                      ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
                      : "border-gray-200 dark:border-gray-700",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center w-14 flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
                          <GithubIcon className="w-4 h-4 text-white dark:text-gray-900" />
                        </div>
                        {githubLinked && githubAvatar && (
                          <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                            <img src={githubAvatar} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100">GitHub</span>
                        {githubLinked && (
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">@{githubUsername}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href="/api/auth/link/github?redirectTo=/internal/onboarding%3Fstep%3D3"
                      className={[
                        "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                        githubLinked
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                          : "bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 dark:text-gray-900 text-white",
                      ].join(" ")}
                    >
                      <GithubIcon className="w-3.5 h-3.5" />
                      {githubLinked ? "再連携" : "連携する"}
                    </a>
                  </div>
                </div>

                {/* X — optional */}
                <div
                  className={[
                    "rounded-xl border p-4 transition-all duration-300",
                    xLinked
                      ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
                      : "border-gray-200 dark:border-gray-700",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center w-14 flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                          <XIcon className="w-4 h-4 text-white" />
                        </div>
                        {xLinked && xAvatar && (
                          <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                            <img src={xAvatar} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100">X (Twitter)</span>
                        {xLinked && (
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">@{xUsername}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href="/api/auth/link/x?redirectTo=/internal/onboarding%3Fstep%3D3"
                      className={[
                        "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                        xLinked
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                          : "bg-black hover:bg-gray-800 text-white",
                      ].join(" ")}
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      {xLinked ? "再連携" : "連携する"}
                    </a>
                  </div>
                </div>

                {/* LinkedIn — optional */}
                <div
                  className={[
                    "rounded-xl border p-4 transition-all duration-300",
                    linkedinLinked
                      ? "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700"
                      : "border-gray-200 dark:border-gray-700",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center w-14 flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-[#0A66C2] flex items-center justify-center">
                          <LinkedInIcon className="w-4 h-4 text-white" />
                        </div>
                        {linkedinLinked && linkedinAvatar && (
                          <div className="absolute left-5 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-900">
                            <img src={linkedinAvatar} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100">LinkedIn</span>
                        {linkedinLinked && (
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">{linkedinUsername}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href="/api/auth/link/linkedin?redirectTo=/internal/onboarding%3Fstep%3D3"
                      className={[
                        "flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                        linkedinLinked
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                          : "bg-[#0A66C2] hover:bg-[#004182] text-white",
                      ].join(" ")}
                    >
                      <LinkedInIcon className="w-3.5 h-3.5" />
                      {linkedinLinked ? "再連携" : "連携する"}
                    </a>
                  </div>
                </div>

                {step3Error && (
                  <p className="text-sm text-red-500 animate-[fadeInUp_300ms_ease_both]">{step3Error}</p>
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={() => goToStep(2)}>
                  ← 戻る
                </Button>
                <Button onClick={handleStep3Next} className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
                  次へ →
                </Button>
              </div>
            </div>}

            {/* Step 4 — 自己紹介 */}
            {currentStep === 4 && <div className="p-8">
              <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">自己紹介</h2>
                <p className="text-muted-foreground mt-1 text-sm">自己紹介はメンバーページで表示されます。</p>
              </div>

              <div className="space-y-2 animate-[fadeInUp_300ms_60ms_ease_both]">
                <Label htmlFor="bio">自己紹介</Label>
                <textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="趣味や得意なことなど、自由に書いてください"
                  rows={5}
                  className="block w-full border border-input rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 resize-none"
                />
                <div className="flex items-start gap-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3 py-2.5">
                  <svg className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Markdownで箇条書きや見出しが使えます（<a href="https://qiita.com/kamorits/items/6f342da395ad57468ae3" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-900 dark:hover:text-purple-100">使い方</a>）</p>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>
                  <p className="text-sm text-blue-700 dark:text-blue-300">プロフィール設定からいつでも編集できます!</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
                <Button variant="ghost" onClick={() => goToStep(3)}>
                  ← 戻る
                </Button>
                <Button onClick={handleStep4Next} disabled={submitting} className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
                  {submitting ? "保存中..." : "次へ →"}
                </Button>
              </div>
            </div>}

            {/* Step 5 — 公開設定 */}
            {currentStep === 5 && <div className="p-8">
              <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">公開設定</h2>
                <p className="text-muted-foreground mt-1 text-sm">各情報を誰に公開するか設定してください。</p>
              </div>

              <div className="space-y-4 animate-[fadeInUp_300ms_60ms_ease_both]">
                {/* 公開レベルの説明 */}
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-500 text-white font-medium flex-shrink-0">非公開</span>
                    <span>自分だけが閲覧できます。他のメンバーにも表示されません。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-block px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-medium flex-shrink-0">内部のみ</span>
                    <span>Lumosにログインしたメンバーだけが閲覧できます。外部サイトには表示されません。</span>
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
                      setVisibility(DEFAULT_VISIBILITY)
                    } else {
                      setVisibility((prev) => {
                        const clamped = { ...prev } as VisibilityForm
                        for (const k of VISIBILITY_DISPLAY_KEYS) {
                          if (clamped[k] === "public") clamped[k] = "internal"
                        }
                        return clamped
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
                    allowPublic ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-gray-300 dark:bg-gray-600",
                  ].join(" ")}>
                    <span className={[
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                      allowPublic ? "translate-x-5" : "translate-x-0.5",
                    ].join(" ")} />
                  </div>
                </div>

                {/* フィールド別設定 */}
                <div className="space-y-1">
                  <div className="flex justify-end gap-6 text-xs text-gray-400 dark:text-gray-500 pr-1">
                    <span>非公開</span>
                    <span>内部のみ</span>
                    <span className={allowPublic ? "" : "opacity-30"}>外部公開</span>
                  </div>
                  {VISIBILITY_DISPLAY_KEYS.map((key) => {
                    if (key === "currentOrg" && form.memberType !== "卒業生") return null
                    return (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {VISIBILITY_LABELS[key]}
                        </span>
                        <VisibilityToggle
                          value={visibility[key]}
                          onChange={(v) => setVisibility((prev) => ({ ...prev, [key]: v }))}
                          max={key === "line" || key === "birthDate" || !allowPublic ? "internal" : undefined}
                          min={key === "discord" ? "internal" : undefined}
                        />
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  ※ 学籍番号は常に非公開です。設定はあとでプロフィール設定から変更できます。
                </p>
              </div>

              <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
                <Button variant="ghost" onClick={() => goToStep(4)}>
                  ← 戻る
                </Button>
                <Button onClick={() => { handleStep5Save(); goToStep(6) }} disabled={submitting} className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
                  次へ →
                </Button>
              </div>
            </div>}

            {/* Step 6 — プロフィール画像 */}
            {currentStep === 6 && <div className="p-8">
              <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">プロフィール画像</h2>
                <p className="text-muted-foreground mt-1 text-sm">顔がわかる写真を設定しましょう（任意）</p>
              </div>

              <div className="space-y-6 animate-[fadeInUp_300ms_60ms_ease_both]">
                {/* Face image preview + upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 relative rounded-full overflow-hidden ring-4 ring-purple-100 dark:ring-purple-900/50">
                    <Image
                      src={faceImageUrl || "/placeholder.svg"}
                      alt="プロフィール画像"
                      fill
                      className="object-cover"
                    />
                  </div>
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx={12} cy={13} r={4} /></svg>
                    画像を選択
                  </Button>
                </div>

                {/* Crop dialog */}
                {cropImageSrc && (
                  <div className="space-y-4">
                    <div className="relative w-full" style={{ height: 300 }}>
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
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="ghost" onClick={() => setCropImageSrc(null)}>
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleCropConfirm}
                        disabled={imageUploading}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                      >
                        {imageUploading ? "アップロード中..." : "切り抜き"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Primary avatar selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-muted-foreground px-2">公開ページの表示画像</span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "face" as const, label: "顔写真", src: faceImageUrl || "/placeholder.svg", enabled: true },
                      { value: "discord" as const, label: "Discord", src: discordAvatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png` : "/placeholder.svg", enabled: !!discordAvatar },
                      { value: "line" as const, label: "LINE", src: lineAvatar || "/placeholder.svg", enabled: lineLinked && !!lineAvatar },
                      { value: "default" as const, label: "なし", src: "/placeholder.svg", enabled: true },
                    ]).map(({ value, label, src, enabled }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={!enabled}
                        onClick={() => setPrimaryAvatar(value)}
                        className={[
                          "flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200",
                          primaryAvatar === value
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-600"
                            : "border-gray-200 dark:border-gray-700",
                          !enabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-purple-300",
                        ].join(" ")}
                      >
                        <div className="w-10 h-10 relative rounded-full overflow-hidden flex-shrink-0">
                          <Image src={src} alt="" fill className="object-cover" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                          {primaryAvatar === value && (
                            <CheckCircleIcon className="inline-block w-4 h-4 ml-1.5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
                <Button variant="ghost" onClick={() => goToStep(5)}>
                  ← 戻る
                </Button>
                <Button onClick={handleComplete} disabled={submitting} className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30">
                  {submitting ? "登録中..." : "登録完了"}
                </Button>
              </div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}
