"use client"

import type {Dispatch, SetStateAction} from "react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import type {FormData} from "./types"

interface Step1BasicInfoProps {
  form: FormData
  setForm: Dispatch<SetStateAction<FormData>>
  step1Errors: Partial<Record<keyof FormData, string>>
  setStep1Errors: Dispatch<SetStateAction<Partial<Record<keyof FormData, string>>>>
  submitting: boolean
  onNext: () => void
}

export function Step1BasicInfo({form, setForm, step1Errors, setStep1Errors, submitting, onNext}: Step1BasicInfoProps) {
  return (
    <div className="p-8">
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
                setForm((f) => ({...f, lastName: e.target.value}))
                if (step1Errors.lastName) setStep1Errors((p) => ({...p, lastName: undefined}))
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
                setForm((f) => ({...f, firstName: e.target.value}))
                if (step1Errors.firstName) setStep1Errors((p) => ({...p, firstName: undefined}))
              }}
              placeholder="太郎"
              className={step1Errors.firstName ? "border-red-400" : ""}
            />
            {step1Errors.firstName && <p className="text-xs text-red-500">{step1Errors.firstName}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 animate-[fadeInUp_300ms_90ms_ease_both]">
          <div className="space-y-1.5">
            <Label htmlFor="lastNameRomaji">
              姓（ローマ字） <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastNameRomaji"
              value={form.lastNameRomaji}
              onChange={(e) => {
                const v = e.target.value.replace(/[^A-Za-z\s-]/g, "")
                const capitalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
                setForm((f) => ({...f, lastNameRomaji: capitalized}))
                if (step1Errors.lastNameRomaji) setStep1Errors((p) => ({
                  ...p,
                  lastNameRomaji: undefined
                }))
              }}
              placeholder="Yamada"
              className={step1Errors.lastNameRomaji ? "border-red-400" : ""}
            />
            {step1Errors.lastNameRomaji &&
              <p className="text-xs text-red-500">{step1Errors.lastNameRomaji}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstNameRomaji">
              名（ローマ字） <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstNameRomaji"
              value={form.firstNameRomaji}
              onChange={(e) => {
                const v = e.target.value.replace(/[^A-Za-z\s-]/g, "")
                const capitalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
                setForm((f) => ({...f, firstNameRomaji: capitalized}))
                if (step1Errors.firstNameRomaji) setStep1Errors((p) => ({
                  ...p,
                  firstNameRomaji: undefined
                }))
              }}
              placeholder="Taro"
              className={step1Errors.firstNameRomaji ? "border-red-400" : ""}
            />
            {step1Errors.firstNameRomaji &&
              <p className="text-xs text-red-500">{step1Errors.firstNameRomaji}</p>}
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
              setForm((f) => ({...f, studentId: e.target.value.toUpperCase()}))
              if (step1Errors.studentId) setStep1Errors((p) => ({...p, studentId: undefined}))
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
            onChange={(e) => setForm((f) => ({...f, birthDate: e.target.value}))}
            className="block w-full"
          />
        </div>

        <div className="space-y-1.5 animate-[fadeInUp_300ms_240ms_ease_both]">
          <Label htmlFor="nickname">ニックネーム</Label>
          <Input
            id="nickname"
            value={form.nickname}
            onChange={(e) => setForm((f) => ({...f, nickname: e.target.value}))}
            placeholder="タロウ"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end animate-[fadeInUp_300ms_300ms_ease_both]">
        <Button onClick={onNext} disabled={submitting}
                className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
          {submitting ? "保存中..." : "次へ →"}
        </Button>
      </div>
    </div>
  )
}
