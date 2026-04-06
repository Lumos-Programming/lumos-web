"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Mail, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "お名前を入力してください";
    }

    if (!formData.email.trim()) {
      newErrors.email = "メールアドレスを入力してください";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }

    if (!formData.message.trim()) {
      newErrors.message = "お問い合わせ内容を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);

      // Simulate form submission
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      }, 1500);
    }
  };

  return (
    <>
      {/* Header Section */}
      <section className="relative pt-16 pb-16 md:pt-40 md:pb-16 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">
              お問い合わせ
            </h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosに関するご質問やお問い合わせ、入会希望は以下のメールアドレスにご連絡ください。
              <br></br>
            </p>
          </div>
        </div>
      </section>

      {/* //問い合わせフォームがないバージョン　これだけだとページがさびしい
      <section className="py-12 md:py-12 bg-white text-gray-900">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg">
                Lumosへのご連絡は、以下の連絡先までお願いいたします。
              </p>
            </div>
          </div>
      </section>

      <section className="py-8 pb-12 md:py-8 md:pb-12">
        <div className="container mx-auto px-2 md:px-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-accent mr-3 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">メールアドレス</h3>
                    <p className="text-gray-600 break-all">
                      lumos.ynu.programming@gmail.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-accent mr-3 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">活動拠点</h3>
                    <p className="text-gray-600">
                      横浜国立大学<br />
                      〒240-0067 横浜市保土ケ谷区常盤台79-5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      */}

      {/* Contact Form Section */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                お問い合わせフォーム
              </h2>

              {isSubmitted ? (
                <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    お問い合わせありがとうございます。内容を確認の上、折り返しご連絡いたします。
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">
                      お名前 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="山田 太郎"
                      className={errors.name ? "border-destructive" : ""}
                      aria-invalid={errors.name ? "true" : "false"}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="text-destructive text-sm">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      メールアドレス <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@ynu.ac.jp"
                      className={errors.email ? "border-destructive" : ""}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                    />
                    {errors.email && (
                      <p id="email-error" className="text-destructive text-sm">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-foreground">
                      件名
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="お問い合わせの件名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-foreground">
                      お問い合わせ内容{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="お問い合わせ内容を入力してください"
                      rows={6}
                      className={errors.message ? "border-destructive" : ""}
                      aria-invalid={errors.message ? "true" : "false"}
                      aria-describedby={
                        errors.message ? "message-error" : undefined
                      }
                    />
                    {errors.message && (
                      <p
                        id="message-error"
                        className="text-destructive text-sm"
                      >
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {Object.keys(errors).length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        入力内容に誤りがあります。修正してください。
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "送信中..." : "送信する"}
                  </Button>
                </form>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                お問い合わせ先
              </h2>
              <div className="space-y-8">
                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-accent-foreground mr-3 mt-1" />
                      <div>
                        <h3 className="font-bold text-foreground">
                          メールアドレス
                        </h3>
                        <p className="text-muted-foreground">
                          lumos.ynu.programming@gmail.com
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-accent-foreground mr-3 mt-1" />
                      <div>
                        <h3 className="font-bold text-foreground">活動拠点</h3>
                        <p className="text-muted-foreground">
                          横浜国立大学
                          <br></br>
                          〒240-0067 横浜市保土ケ谷区常盤台79-5
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

      {/* 入会手続き */}
      {/*
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">入会手続き</h2>
            <p className="text-gray-600">下記のURLからフォームの入力をお願いします。<br></br>※他大学も入会可</p>
          </div>

        </div>
      </section>
      */}
    </>
  );
}
