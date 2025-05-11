"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Mail, MapPin, Phone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "お名前を入力してください"
    }

    if (!formData.email.trim()) {
      newErrors.email = "メールアドレスを入力してください"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "有効なメールアドレスを入力してください"
    }

    if (!formData.message.trim()) {
      newErrors.message = "お問い合わせ内容を入力してください"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      setIsSubmitting(true)

      // Simulate form submission
      setTimeout(() => {
        setIsSubmitting(false)
        setIsSubmitted(true)
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        })
      }, 1500)
    }
  }

  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6">お問い合わせ</h1>
            <p className="text-xl">
              Lumosに関するご質問やお問い合わせは、こちらのフォームからお気軽にご連絡ください。
              <br />
              入会希望の方も、まずはお問い合わせください。
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">お問い合わせフォーム</h2>

              {isSubmitted ? (
                <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    お問い合わせありがとうございます。内容を確認の上、担当者より折り返しご連絡いたします。
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      お名前 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="山田 太郎"
                      className={errors.name ? "border-red-500" : ""}
                      aria-invalid={errors.name ? "true" : "false"}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="text-red-500 text-sm">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      メールアドレス <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@ynu.ac.jp"
                      className={errors.email ? "border-red-500" : ""}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-red-500 text-sm">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">件名</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="お問い合わせの件名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      お問い合わせ内容 <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="お問い合わせ内容を入力してください"
                      rows={6}
                      className={errors.message ? "border-red-500" : ""}
                      aria-invalid={errors.message ? "true" : "false"}
                      aria-describedby={errors.message ? "message-error" : undefined}
                    />
                    {errors.message && (
                      <p id="message-error" className="text-red-500 text-sm">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {Object.keys(errors).length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>入力内容に誤りがあります。修正してください。</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="bg-accent hover:bg-accent/90 text-primary w-full md:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "送信中..." : "送信する"}
                  </Button>
                </form>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">お問い合わせ先</h2>
              <div className="space-y-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-accent mr-3 mt-1" />
                      <div>
                        <h3 className="font-bold">メールアドレス</h3>
                        <p className="text-gray-600">info@lumos-ynu.org</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-accent mr-3 mt-1" />
                      <div>
                        <h3 className="font-bold">活動場所</h3>
                        <p className="text-gray-600">
                          横浜国立大学 情報基盤センター 3階セミナールーム
                          <br />
                          〒240-8501 横浜市保土ケ谷区常盤台79-5
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-accent mr-3 mt-1" />
                      <div>
                        <h3 className="font-bold">活動日時</h3>
                        <p className="text-gray-600">
                          毎週水曜日 18:00-20:00
                          <br />
                          ※長期休暇中は変更になる場合があります
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">アクセスマップ</h2>
            <p className="text-gray-600">横浜国立大学 情報基盤センターへのアクセス方法</p>
          </div>

          <div className="aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg">
            {/* 実際のサイトではGoogle Mapsなどの埋め込みマップを使用 */}
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <p className="text-gray-600">ここにマップが表示されます</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
