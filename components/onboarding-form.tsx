"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FACULTIES } from "@/types/profile"

interface FormData {
  lastName: string
  firstName: string
  studentId: string
  faculty: string
  nickname: string
}

const DEFAULT_FORM: FormData = {
  lastName: "",
  firstName: "",
  studentId: "",
  faculty: "",
  nickname: "",
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

export default function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [lineUsername, setLineUsername] = useState<string>("")
  const [lineLinked, setLineLinked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData & { line: string }>>({})
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            studentId: data.studentId ?? "",
            faculty: data.faculty ?? "",
            nickname: data.nickname ?? "",
          })
          setLineLinked(!!data.lineId)
          setLineUsername(data.line ?? "")
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Handle LINE OAuth callback result
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success === "line_linked") {
      setLineLinked(true)
      // Refetch to get LINE username
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => { if (data?.line) setLineUsername(data.line) })
        .catch(console.error)
      router.replace("/internal/onboarding")
    }
    if (error === "line_link_failed") {
      setErrors((prev) => ({ ...prev, line: "LINE連携に失敗しました。もう一度お試しください。" }))
      router.replace("/internal/onboarding")
    }
  }, [searchParams, router])

  const saveProfile = useCallback(async (data: FormData) => {
    setSaveStatus("saving")
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
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
        }),
      })
      setSaveStatus(res.ok ? "saved" : "error")
    } catch {
      setSaveStatus("error")
    }
  }, [])

  const handleChange = (field: keyof FormData, value: string) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => saveProfile(updated), 800)
  }

  const validate = (): boolean => {
    const newErrors: Partial<FormData & { line: string }> = {}
    if (!form.lastName.trim()) newErrors.lastName = "姓を入力してください"
    if (!form.firstName.trim()) newErrors.firstName = "名を入力してください"
    if (!form.studentId.trim()) newErrors.studentId = "学籍番号を入力してください"
    if (!form.faculty) newErrors.faculty = "学部を選択してください"
    if (!lineLinked) newErrors.line = "LINEアカウントを連携してください"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await saveProfile(form)
      const res = await fetch("/api/onboarding", { method: "POST" })
      if (res.ok) {
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

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lastName">
              姓 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder="山田"
            />
            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">
              名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder="太郎"
            />
            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="studentId">
            学籍番号 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="studentId"
            value={form.studentId}
            onChange={(e) => handleChange("studentId", e.target.value)}
            placeholder="AB12345678"
          />
          {errors.studentId && <p className="text-xs text-red-500">{errors.studentId}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="faculty">
            学部 <span className="text-red-500">*</span>
          </Label>
          <select
            id="faculty"
            value={form.faculty}
            onChange={(e) => handleChange("faculty", e.target.value)}
            className="block w-full border border-input rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="">選択してください</option>
            {FACULTIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {errors.faculty && <p className="text-xs text-red-500">{errors.faculty}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">ニックネーム</Label>
          <Input
            id="nickname"
            value={form.nickname}
            onChange={(e) => handleChange("nickname", e.target.value)}
            placeholder="タロウ"
          />
        </div>

        <div className="space-y-2">
          <Label>
            LINE <span className="text-red-500">*</span>
          </Label>
          {lineLinked ? (
            <div className="flex items-center gap-3 p-3 border rounded-md bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <LineIcon className="w-5 h-5 text-[#06C755]" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                @{lineUsername} で連携済み ✓
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/link/line?redirectTo=/internal/onboarding"
              }}
              className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05a848] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              <LineIcon className="w-4 h-4" />
              LINEアカウントを連携する
            </button>
          )}
          {errors.line && <p className="text-xs text-red-500">{errors.line}</p>}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {saveStatus === "saving" && "保存中..."}
            {saveStatus === "saved" && "保存済み ✓"}
            {saveStatus === "error" && "保存に失敗しました"}
          </span>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "送信中..." : "登録完了"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
