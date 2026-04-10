"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { cropAndResizeImage } from "@/lib/image-crop";
import type { EnrollmentType } from "@/types/profile";
import { GRADUATE_SCHOOLS } from "@/types/profile";
import { DEFAULT_RING_COLOR } from "@/types/member";
import type { RingColorKey } from "@/types/member";
import type { SnsEntry } from "@/components/member-tile-preview";
import type { Area } from "react-easy-crop";
import type { PublicImageOption } from "@/lib/members";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { normalizeLinkedInUrl } from "@/lib/linkedin";
import type { FormData, VisibilityForm } from "./onboarding/types";
import { VISIBILITY_DISPLAY_KEYS } from "./onboarding/types";
import {
  DEFAULT_FORM,
  DEFAULT_VISIBILITY,
  calcProgress,
  STEP_LABELS_BASE,
  STEP_LABELS_WITH_AVATAR,
} from "./onboarding/types";
import { WelcomeScreen } from "./onboarding/welcome-screen";
import { StepIndicator } from "./onboarding/step-indicator";
import { Step1BasicInfo } from "./onboarding/step1-basic-info";
import { Step2Enrollment } from "./onboarding/step2-enrollment";
import { Step3Sns } from "./onboarding/step3-sns";
import { Step4Profile } from "./onboarding/step4-profile";
import { Step5Visibility } from "./onboarding/step5-visibility";
import { Step6Photo } from "./onboarding/step6-photo";
import { Step7Avatar } from "./onboarding/step7-avatar";
import {
  PreviewIslandStep4,
  PreviewIslandStep5,
} from "./onboarding/preview-islands";

export default function OnboardingForm({
  lineBotFriendUrl,
  isReturningMember,
}: {
  lineBotFriendUrl?: string;
  isReturningMember?: boolean;
}) {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.status === 404) {
      signOut({ redirectTo: "/onboarding" });
      throw new Error("Profile not found");
    }
    return res.json();
  }, []);

  const isPreview =
    process.env.NODE_ENV === "development" &&
    searchParams.get("preview") !== null;

  const initialStep = (() => {
    const s = parseInt(searchParams.get("step") ?? "1", 10);
    return s >= 1 && s <= 7 ? s : 1;
  })();

  const [showWelcome, setShowWelcome] = useState(
    !searchParams.get("step") &&
      !searchParams.get("success") &&
      !searchParams.get("error"),
  );
  const [welcomeFading, setWelcomeFading] = useState(false);
  const [showFeeNotice, setShowFeeNotice] = useState(false);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [allowPublic, setAllowPublic] = useState(true);
  const [visibility, setVisibility] =
    useState<VisibilityForm>(DEFAULT_VISIBILITY);
  const [lineUsername, setLineUsername] = useState("");
  const [lineLinked, setLineLinked] = useState(false);
  const [lineAvatar, setLineAvatar] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubLinked, setGithubLinked] = useState(false);
  const [githubAvatar, setGithubAvatar] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [xLinked, setXLinked] = useState(false);
  const [xAvatar, setXAvatar] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step1Errors, setStep1Errors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [step2Errors, setStep2Errors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [lineGroupJoined, setLineGroupJoined] = useState(false);
  const [lineGroupCheckPending, setLineGroupCheckPending] = useState(false);

  const [step3Error, setStep3Error] = useState("");
  const [linkedinError, setLinkedinError] = useState("");
  const [slideAnimating, setSlideAnimating] = useState(false);
  const [discordId, setDiscordId] = useState("");
  const [discordAvatar, setDiscordAvatar] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  // Step 6 — image
  const [faceImageUrl, setFaceImageUrl] = useState("");
  const [customPublicImageUrl, setCustomPublicImageUrl] = useState("");
  const [publicImageOption, setPublicImageOption] =
    useState<PublicImageOption>("face");
  const [ringColor, setRingColor] = useState<RingColorKey>(DEFAULT_RING_COLOR);
  const [previewView, setPreviewView] = useState<"tile" | "detail">("tile");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [blobAnimating, setBlobAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevStepRef = useRef(initialStep);
  const step2CacheKey = "onboarding_step2_cache";
  const step2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveStep2Cache = useCallback((f: FormData) => {
    if (step2TimerRef.current) clearTimeout(step2TimerRef.current);
    step2TimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          step2CacheKey,
          JSON.stringify({
            studentId: f.studentId,
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
          }),
        );
      } catch {
        /* localStorage unavailable */
      }
    }, 500);
  }, []);

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        if (data && !data.error) {
          type EnrollmentEntry = {
            isCurrent: boolean;
            faculty: string;
            admissionYear: string;
            enrollmentType: string;
            transferYear?: string;
            graduationYear?: string;
          };
          const enrollments: EnrollmentEntry[] = data.enrollments ?? [];
          const currentEnrollment = enrollments.find((e) => e.isCurrent);
          const undergradEnrollment =
            data.memberType === "院生" || data.memberType === "卒業生"
              ? enrollments.find((e) => !e.isCurrent)
              : undefined;
          const hasUndergrad =
            data.memberType === "院生" || data.memberType === "卒業生"
              ? undergradEnrollment
                ? true
                : enrollments.length > 0
                  ? false
                  : null
              : null;

          // localStorage キャッシュで未保存の Step 2 フィールドを補完
          let cache: Partial<FormData> = {};
          try {
            const raw = localStorage.getItem(step2CacheKey);
            if (raw) cache = JSON.parse(raw);
          } catch {
            /* ignore */
          }

          setForm({
            lastName: data.lastName ?? "",
            firstName: data.firstName ?? "",
            lastNameRomaji: data.lastNameRomaji ?? "",
            firstNameRomaji: data.firstNameRomaji ?? "",
            studentId: data.studentId || cache.studentId || "",
            birthDate: data.birthDate ?? "",
            gender: data.gender ?? "",
            nickname: data.nickname ?? "",
            memberType: data.memberType || cache.memberType || "",
            schoolYear:
              data.yearByFiscal?.[String(new Date().getFullYear())] ||
              cache.schoolYear ||
              "",
            faculty: currentEnrollment?.faculty || cache.faculty || "",
            admissionYear:
              currentEnrollment?.admissionYear || cache.admissionYear || "",
            enrollmentType: (currentEnrollment?.enrollmentType ||
              cache.enrollmentType ||
              "") as EnrollmentType | "",
            transferYear:
              currentEnrollment?.transferYear || cache.transferYear || "",
            graduationYear:
              currentEnrollment?.graduationYear || cache.graduationYear || "",
            hasUndergrad: hasUndergrad ?? cache.hasUndergrad ?? null,
            undergradFaculty:
              undergradEnrollment?.faculty || cache.undergradFaculty || "",
            undergradAdmissionYear:
              undergradEnrollment?.admissionYear ||
              cache.undergradAdmissionYear ||
              "",
            undergradEnrollmentType: (undergradEnrollment?.enrollmentType ||
              cache.undergradEnrollmentType ||
              "") as EnrollmentType | "",
            undergradTransferYear:
              undergradEnrollment?.transferYear ||
              cache.undergradTransferYear ||
              "",
            currentOrg: data.currentOrg || cache.currentOrg || "",
            interests: data.interests ?? [],
            topInterests: data.topInterests ?? [],
            bio: data.bio ?? "",
          });
          if (typeof data.allowPublic === "boolean") {
            setAllowPublic(data.allowPublic);
            if (!data.allowPublic) {
              setVisibility((prev) => {
                const vis = { ...prev };
                let changed = false;
                for (const k of VISIBILITY_DISPLAY_KEYS) {
                  if (vis[k] === "public") {
                    vis[k] = "internal";
                    changed = true;
                  }
                }
                return changed ? vis : prev;
              });
            }
          }
          if (data.discordId) setDiscordId(data.discordId);
          if (data.discordUsername) setDiscordUsername(data.discordUsername);
          if (data.discordAvatar) setDiscordAvatar(data.discordAvatar);
          if (data.faceImage) setFaceImageUrl(data.faceImage);
          if (data.customPublicImage)
            setCustomPublicImageUrl(data.customPublicImage);
          setPublicImageOption(
            data.publicImageOption || (data.faceImage ? "face" : "discord"),
          );
          if (data.ringColor) setRingColor(data.ringColor);
          setLineLinked(!!data.lineId);
          setLineUsername(data.line ?? "");
          setLineAvatar(data.lineAvatar ?? "");
          if (data.lineId) {
            fetch("/api/line-group/check-membership")
              .then((r) => r.json())
              .then((d) => {
                if (d.isMember) setLineGroupJoined(true);
                else setLineGroupCheckPending(true);
              })
              .catch(() => {});
          }
          setGithubLinked(!!data.githubId);
          setGithubUsername(data.github ?? "");
          setGithubAvatar(data.githubAvatar ?? "");
          setXLinked(!!data.xId);
          setXUsername(data.x ?? "");
          setXAvatar(data.xAvatar ?? "");
          setLinkedinUrl(data.linkedin ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchProfile]);

  // Handle OAuth callback results
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const stepParam = searchParams.get("step");

    if (success === "line_linked") {
      setLineLinked(true);
      const lineGroup = searchParams.get("line_group");
      if (lineGroup === "not_joined") {
        setLineGroupCheckPending(true);
      } else {
        // line_group param未指定 = APIでグループチェック
        fetch("/api/line-group/check-membership")
          .then((r) => r.json())
          .then((d) => {
            if (d.isMember) setLineGroupJoined(true);
            else setLineGroupCheckPending(true);
          })
          .catch(() => {});
      }
      fetchProfile()
        .then((data) => {
          if (data?.line) {
            setLineUsername(data.line);
            setLineAvatar(data.lineAvatar ?? "");
          }
        })
        .catch(console.error);
    } else if (success === "github_linked") {
      setGithubLinked(true);
      fetchProfile()
        .then((data) => {
          if (data?.github) {
            setGithubUsername(data.github);
            setGithubAvatar(data.githubAvatar ?? "");
          }
        })
        .catch(console.error);
    } else if (success === "x_linked") {
      setXLinked(true);
      fetchProfile()
        .then((data) => {
          if (data?.x) {
            setXUsername(data.x);
            setXAvatar(data.xAvatar ?? "");
          }
        })
        .catch(console.error);
    } else if (error === "line_link_failed") {
      setStep3Error("LINE連携に失敗しました。もう一度お試しください。");
    } else if (error === "github_link_failed") {
      setStep3Error("GitHub連携に失敗しました。もう一度お試しください。");
    } else if (error === "x_link_failed") {
      setStep3Error("X連携に失敗しました。もう一度お試しください。");
    }

    if (success || error) {
      const step = stepParam ? parseInt(stepParam, 10) : 3;
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("error");
      url.searchParams.delete("line_group");
      const params = new URLSearchParams();
      if (step) params.set("step", String(step));
      if (isPreview) params.set("preview", "");
      const qs = params.toString();
      router.replace(url.pathname + (qs ? `?${qs}` : ""));
    }
  }, [searchParams, router, isPreview, fetchProfile]);

  const saveStep1 = useCallback(async (data: FormData): Promise<boolean> => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName: data.lastName,
          firstName: data.firstName,
          lastNameRomaji: data.lastNameRomaji,
          firstNameRomaji: data.firstNameRomaji,
          nickname: data.nickname,
          birthDate: data.birthDate,
          gender: data.gender,
          bio: data.bio,
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
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const goToStep = (next: number) => {
    if (slideAnimating) return;
    prevStepRef.current = currentStep;
    setSlideAnimating(true);
    setCurrentStep(next);
    router.replace(`?step=${next}${isPreview ? "&preview" : ""}`);
    setTimeout(() => setSlideAnimating(false), 400);
  };

  const handleStep1Next = async () => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.lastName.trim()) errors.lastName = "姓を入力してください";
    if (!form.firstName.trim()) errors.firstName = "名を入力してください";
    if (!form.lastNameRomaji.trim()) {
      errors.lastNameRomaji = "姓（ローマ字）を入力してください";
    } else if (!/^[A-Za-z\s-]+$/.test(form.lastNameRomaji.trim())) {
      errors.lastNameRomaji = "ローマ字（半角英字）で入力してください";
    }
    if (!form.firstNameRomaji.trim()) {
      errors.firstNameRomaji = "名（ローマ字）を入力してください";
    } else if (!/^[A-Za-z\s-]+$/.test(form.firstNameRomaji.trim())) {
      errors.firstNameRomaji = "ローマ字（半角英字）で入力してください";
    }
    if (!form.gender) errors.gender = "性別を選択してください";
    setStep1Errors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const ok = await saveStep1(form);
    setSubmitting(false);
    if (!ok) {
      setStep1Errors({
        lastName: "保存に失敗しました。もう一度お試しください。",
      });
      return;
    }
    goToStep(2);
  };

  const setFormStep2 = useCallback(
    (updater: (f: FormData) => FormData) => {
      setForm((f) => {
        const next = updater(f);
        saveStep2Cache(next);
        return next;
      });
    },
    [saveStep2Cache],
  );

  const saveStep2 = useCallback(async (data: FormData): Promise<boolean> => {
    const enrollments = [
      ...(data.faculty
        ? [
            {
              faculty: data.faculty,
              admissionYear: data.admissionYear,
              enrollmentType: data.enrollmentType || "入学",
              ...(data.transferYear ? { transferYear: data.transferYear } : {}),
              ...(data.graduationYear
                ? { graduationYear: data.graduationYear }
                : {}),
              isCurrent: true,
            },
          ]
        : []),
      ...((data.memberType === "院生" || data.memberType === "卒業生") &&
      data.hasUndergrad &&
      data.undergradFaculty
        ? [
            {
              faculty: data.undergradFaculty,
              admissionYear: data.undergradAdmissionYear,
              enrollmentType: data.undergradEnrollmentType || "入学",
              ...(data.undergradTransferYear
                ? { transferYear: data.undergradTransferYear }
                : {}),
              isCurrent: false,
            },
          ]
        : []),
    ];
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberType: data.memberType,
          ...(data.studentId ? { studentId: data.studentId } : {}),
          yearByFiscal: data.schoolYear
            ? { [String(new Date().getFullYear())]: data.schoolYear }
            : undefined,
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
            gender: "internal",
            bio: "public",
            line: "internal",
            github: "public",
            x: "public",
            linkedin: "public",
            discord: "public",
          },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const handleStep2Next = async () => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.memberType) errors.memberType = "種別を選択してください";
    if (form.memberType) {
      if (!form.studentId.trim()) {
        errors.studentId = "学籍番号を入力してください";
      } else if (!/^\d{2}[A-Z0-9]{2}\d{3}$/.test(form.studentId.trim())) {
        errors.studentId =
          "学籍番号の形式が正しくありません（例: 2164078 / 24HJ078）";
      }
      if (form.memberType !== "卒業生" && !form.schoolYear)
        errors.schoolYear = "学年を選択してください";
    }
    if (!form.faculty) errors.faculty = "学部/学府を選択してください";
    if (!form.admissionYear)
      errors.admissionYear = "入学年度を選択してください";
    if (form.memberType === "卒業生" && !form.graduationYear)
      errors.graduationYear = "卒業年度を選択してください";
    // 院生、または卒業生かつ学府選択時で hasUndergrad=true の場合
    const showUndergradSection =
      form.memberType === "院生" ||
      (form.memberType === "卒業生" &&
        (GRADUATE_SCHOOLS as readonly string[]).includes(form.faculty));
    if (showUndergradSection && form.hasUndergrad === true) {
      if (!form.undergradFaculty)
        errors.undergradFaculty = "所属学部を選択してください";
      if (!form.undergradAdmissionYear)
        errors.undergradAdmissionYear = "入学年度を選択してください";
    }
    setStep2Errors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const ok = await saveStep2(form);
    setSubmitting(false);
    if (!ok) {
      setStep2Errors({
        faculty: "保存に失敗しました。もう一度お試しください。",
      });
      return;
    }
    try {
      localStorage.removeItem(step2CacheKey);
    } catch {
      /* ignore */
    }
    goToStep(3);
  };

  const handleLinkedinBlur = useCallback(() => {
    if (!linkedinUrl.trim()) {
      setLinkedinError("");
      return;
    }
    const normalized = normalizeLinkedInUrl(linkedinUrl);
    if (normalized) {
      setLinkedinUrl(normalized);
      setLinkedinError("");
    } else {
      setLinkedinError(
        "LinkedInのプロフィールURLを入力してください（例: https://linkedin.com/in/username）",
      );
    }
  }, [linkedinUrl]);

  const handleStep3Next = async () => {
    if (!lineLinked) {
      setStep3Error("LINEアカウントの連携は必須です");
      return;
    }
    if (!lineGroupJoined) {
      setStep3Error("LINEグループへの参加が必要です");
      return;
    }
    setStep3Error("");
    // Validate & normalize LinkedIn URL if provided
    if (linkedinUrl.trim()) {
      const normalized = normalizeLinkedInUrl(linkedinUrl);
      if (!normalized) {
        setLinkedinError(
          "LinkedInのプロフィールURLを入力してください（例: https://linkedin.com/in/username）",
        );
        return;
      }
      setLinkedinUrl(normalized);
      setLinkedinError("");
      try {
        await fetch("/api/settings/sns", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkedin: normalized }),
        });
      } catch {
        /* non-blocking */
      }
    }
    goToStep(4);
  };

  const handleStep4Next = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: form.bio,
          interests: form.interests,
          topInterests: form.topInterests,
        }),
      });
    } catch {
      /* ignore — non-blocking */
    }
    setSubmitting(false);
    goToStep(5);
  };

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
            gender: visibility.gender,
            bio: visibility.bio,
            line: visibility.line,
            github: visibility.github,
            x: visibility.x,
            linkedin: visibility.linkedin,
            discord: visibility.discord,
          },
        }),
      });
    } catch {
      /* non-blocking */
    }
  }, [allowPublic, visibility]);

  const resolveDiscordAvatarUrl = useCallback(
    (id: string, avatar: string): string => {
      if (!avatar) return "/placeholder.svg";
      if (avatar.startsWith("http")) return avatar;
      return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
    },
    [],
  );

  const discordAvatarUrl = useMemo(
    () => resolveDiscordAvatarUrl(discordId, discordAvatar),
    [resolveDiscordAvatarUrl, discordId, discordAvatar],
  );

  const getOnbInitials = useCallback(() => {
    const f = form.firstNameRomaji?.trim();
    const l = form.lastNameRomaji?.trim();
    if (f && l) return `${f[0].toUpperCase()}. ${l[0].toUpperCase()}.`;
    return "";
  }, [form.firstNameRomaji, form.lastNameRomaji]);

  const onbInternalPreview = useMemo(() => {
    const v = visibility;
    const hasName = v.lastName !== "private" && v.firstName !== "private";
    const fullName = hasName
      ? `${form.lastName} ${form.firstName}`.trim()
      : undefined;
    const hasNickname = v.nickname !== "private" && !!form.nickname;
    const nickname = hasNickname ? form.nickname : undefined;

    let main: string;
    let sub: string | undefined;
    if (nickname && fullName && nickname !== fullName) {
      main = nickname;
      sub = fullName;
    } else if (nickname) {
      main = nickname;
    } else if (fullName) {
      main = fullName;
    } else {
      main = getOnbInitials() || "名前未設定";
    }

    const dept = v.faculty !== "private" ? form.faculty : "";
    const mainImage = faceImageUrl || "/assets/lumos_logo-full.png";
    return {
      main,
      sub,
      department: dept,
      year: form.schoolYear,
      primaryAvatar: mainImage,
      secondaryAvatar:
        discordAvatarUrl !== "/placeholder.svg" ? discordAvatarUrl : undefined,
    };
  }, [
    visibility,
    form.lastName,
    form.firstName,
    form.nickname,
    form.faculty,
    form.schoolYear,
    faceImageUrl,
    discordAvatarUrl,
    getOnbInitials,
  ]);

  const onbExternalPreview = useMemo(() => {
    const v = visibility;
    const hasName = v.lastName === "public" && v.firstName === "public";
    const fullName = hasName
      ? `${form.lastName} ${form.firstName}`.trim()
      : undefined;
    const hasNickname = v.nickname === "public" && !!form.nickname;
    const nickname = hasNickname ? form.nickname : undefined;

    let main: string;
    let sub: string | undefined;
    if (nickname && fullName && nickname !== fullName) {
      main = nickname;
      sub = fullName;
    } else if (nickname) {
      main = nickname;
    } else if (fullName) {
      main = fullName;
    } else {
      main = getOnbInitials() || "名前未設定";
    }

    const dept = v.faculty === "public" ? form.faculty : "";

    let avatar: string;
    switch (publicImageOption) {
      case "face":
        avatar = faceImageUrl || "/assets/lumos_logo-full.png";
        break;
      case "discord":
        avatar =
          discordAvatarUrl !== "/placeholder.svg"
            ? discordAvatarUrl
            : "/assets/lumos_logo-full.png";
        break;
      case "line":
        avatar = lineAvatar || "/assets/lumos_logo-full.png";
        break;
      case "custom":
        avatar = customPublicImageUrl || "/assets/lumos_logo-full.png";
        break;
      default:
        avatar = "/assets/lumos_logo-full.png";
    }
    return {
      main,
      sub,
      department: dept,
      year: form.schoolYear,
      primaryAvatar: avatar,
    };
  }, [
    visibility,
    form.lastName,
    form.firstName,
    form.nickname,
    form.faculty,
    form.schoolYear,
    faceImageUrl,
    customPublicImageUrl,
    publicImageOption,
    discordAvatarUrl,
    lineAvatar,
    getOnbInitials,
  ]);

  const buildOnbSnsEntries = useCallback(
    (level: "public" | "internal") => {
      const v = visibility;
      const check =
        level === "public"
          ? (l: string) => l === "public"
          : (l: string) => l !== "private";
      const entries: SnsEntry[] = [];
      if (check(v.discord) && discordUsername)
        entries.push({
          platform: "discord",
          username: discordUsername,
          url: `https://discord.com/users/${discordId}`,
          avatarUrl:
            discordAvatarUrl !== "/placeholder.svg"
              ? discordAvatarUrl
              : undefined,
        });
      if (check(v.line) && lineUsername)
        entries.push({
          platform: "line",
          username: lineUsername,
          avatarUrl: lineAvatar || undefined,
        });
      if (check(v.github) && githubUsername)
        entries.push({
          platform: "github",
          username: githubUsername,
          url: `https://github.com/${githubUsername}`,
          avatarUrl: githubAvatar || undefined,
        });
      if (check(v.x) && xUsername)
        entries.push({
          platform: "x",
          username: xUsername,
          url: `https://x.com/${xUsername}`,
          avatarUrl: xAvatar || undefined,
        });
      if (check(v.linkedin) && linkedinUrl) {
        const vanity =
          linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] ?? "LinkedIn";
        entries.push({
          platform: "linkedin",
          username: vanity,
          url: linkedinUrl,
        });
      }
      return entries;
    },
    [
      visibility,
      githubUsername,
      githubAvatar,
      xUsername,
      xAvatar,
      discordId,
      discordUsername,
      discordAvatarUrl,
      lineUsername,
      lineAvatar,
      linkedinUrl,
    ],
  );

  const onbInternalSns = useMemo(
    () => buildOnbSnsEntries("internal"),
    [buildOnbSnsEntries],
  );
  const onbExternalSns = useMemo(
    () => buildOnbSnsEntries("public"),
    [buildOnbSnsEntries],
  );

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    setImageUploading(true);
    try {
      const blob = await cropAndResizeImage(cropImageSrc, croppedAreaPixels, {
        maxSize: 1024,
      });
      const formData = new FormData();
      formData.append("image", blob, "profile.webp");
      const res = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setFaceImageUrl(url);
        setCropImageSrc(null);
        setBlobAnimating(true);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "アップロードに失敗しました",
          description: data.error || "しばらく経ってから再度お試しください。",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "アップロードに失敗しました",
        description:
          "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
      });
    } finally {
      setImageUploading(false);
    }
  }, [cropImageSrc, croppedAreaPixels]);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          lastName: form.lastName,
          firstName: form.firstName,
          lastNameRomaji: form.lastNameRomaji,
          firstNameRomaji: form.firstNameRomaji,
          nickname: form.nickname,
          birthDate: form.birthDate,
          gender: form.gender,
          bio: form.bio,
          interests: form.interests,
          topInterests: form.topInterests,
          allowPublic,
          publicImageOption,
          ringColor,
          visibility: {
            studentId: "private",
            nickname: visibility.nickname,
            lastName: visibility.lastName,
            firstName: visibility.firstName,
            faculty: visibility.faculty,
            currentOrg: visibility.currentOrg,
            birthDate: visibility.birthDate,
            gender: visibility.gender,
            bio: visibility.bio,
            line: visibility.line,
            github: visibility.github,
            x: visibility.x,
            linkedin: visibility.linkedin,
            discord: visibility.discord,
          },
        }),
      });
      if (isPreview) {
        // Preview mode: skip marking onboarding as complete, just show the complete page
        try {
          localStorage.removeItem(step2CacheKey);
        } catch {
          /* ignore */
        }
        router.push("/internal/onboarding/complete?preview");
        return;
      }
      const res = await fetch("/api/onboarding", { method: "POST" });
      if (res.ok) {
        try {
          localStorage.removeItem(step2CacheKey);
        } catch {
          /* ignore */
        }
        await updateSession();
        router.push("/internal/onboarding/complete");
      } else {
        const data = await res.json();
        if (data.missing) {
          console.error("Missing required fields:", data.missing);
        }
        toast({
          variant: "destructive",
          title: "登録に失敗しました",
          description: data.error ?? "もう一度お試しください。",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: "もう一度お試しください。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ステップ構成: allowPublic なら 7 ステップ、そうでなければ 6 ステップ
  const stepLabels = allowPublic ? STEP_LABELS_WITH_AVATAR : STEP_LABELS_BASE;
  const maxStep = stepLabels.length;
  // 最終ステップかどうか（handleComplete を呼ぶステップ）
  const isFinalStep = (step: number) => step === maxStep;

  // 進捗 % 計算
  const progressPercent = calcProgress({
    form,
    currentStep,
    lineLinked,
    githubLinked,
    xLinked,
    faceImageUrl,
  });

  const dismissWelcome = useCallback(() => {
    setWelcomeFading(true);
    setTimeout(() => {
      setShowWelcome(false);
      setWelcomeFading(false);
      if (isReturningMember) {
        setShowFeeNotice(true);
      }
    }, 500);
  }, [isReturningMember]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <WelcomeScreen welcomeFading={welcomeFading} onDismiss={dismissWelcome} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex flex-col items-center pt-8 pb-8 px-4 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`w-full relative z-10 transition-all duration-300 max-w-lg`}
      >
        <StepIndicator
          stepLabels={stepLabels}
          currentStep={currentStep}
          progressPercent={progressPercent}
        />

        {/* Card with active step */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-800/50 overflow-hidden">
          <div>
            {currentStep === 1 && (
              <Step1BasicInfo
                form={form}
                setForm={setForm}
                step1Errors={step1Errors}
                setStep1Errors={setStep1Errors}
                submitting={submitting}
                onNext={handleStep1Next}
              />
            )}

            {currentStep === 2 && (
              <Step2Enrollment
                form={form}
                setFormStep2={setFormStep2}
                step2Errors={step2Errors}
                setStep2Errors={setStep2Errors}
                submitting={submitting}
                onNext={handleStep2Next}
                onBack={() => goToStep(1)}
              />
            )}

            {currentStep === 3 && (
              <Step3Sns
                lineLinked={lineLinked}
                lineUsername={lineUsername}
                lineAvatar={lineAvatar}
                lineGroupJoined={lineGroupJoined}
                lineGroupCheckPending={lineGroupCheckPending}
                lineBotFriendUrl={lineBotFriendUrl}
                onLineGroupJoined={() => {
                  setLineGroupJoined(true);
                  setLineGroupCheckPending(false);
                }}
                githubLinked={githubLinked}
                githubUsername={githubUsername}
                githubAvatar={githubAvatar}
                xLinked={xLinked}
                xUsername={xUsername}
                xAvatar={xAvatar}
                linkedinUrl={linkedinUrl}
                onLinkedinUrlChange={(v) => {
                  setLinkedinUrl(v);
                  setLinkedinError("");
                }}
                linkedinError={linkedinError}
                onLinkedinBlur={handleLinkedinBlur}
                step3Error={step3Error}
                onNext={handleStep3Next}
                onBack={() => goToStep(2)}
              />
            )}

            {currentStep === 4 && (
              <Step4Profile
                form={form}
                setForm={setForm}
                submitting={submitting}
                onNext={handleStep4Next}
                onBack={() => goToStep(3)}
              />
            )}

            {currentStep === 5 && (
              <Step5Visibility
                form={form}
                allowPublic={allowPublic}
                setAllowPublic={setAllowPublic}
                visibility={visibility}
                setVisibility={setVisibility}
                submitting={submitting}
                onNext={() => {
                  handleStep5Save();
                  goToStep(6);
                }}
                onBack={() => goToStep(4)}
              />
            )}

            {currentStep === 6 && (
              <Step6Photo
                faceImageUrl={faceImageUrl}
                ringColor={ringColor}
                setRingColor={setRingColor}
                cropImageSrc={cropImageSrc}
                setCropImageSrc={setCropImageSrc}
                crop={crop}
                setCrop={setCrop}
                zoom={zoom}
                setZoom={setZoom}
                setCroppedAreaPixels={setCroppedAreaPixels}
                imageUploading={imageUploading}
                blobAnimating={blobAnimating}
                setBlobAnimating={setBlobAnimating}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                handleCropConfirm={handleCropConfirm}
                isFinalStep={isFinalStep(6)}
                submitting={submitting}
                onComplete={handleComplete}
                onNextStep={() => goToStep(7)}
                onBack={() => goToStep(5)}
              />
            )}

            {currentStep === 7 && allowPublic && (
              <Step7Avatar
                form={form}
                faceImageUrl={faceImageUrl}
                customPublicImageUrl={customPublicImageUrl}
                setCustomPublicImageUrl={setCustomPublicImageUrl}
                publicImageOption={publicImageOption}
                setPublicImageOption={setPublicImageOption}
                ringColor={ringColor}
                discordId={discordId}
                discordAvatar={discordAvatar}
                lineLinked={lineLinked}
                lineAvatar={lineAvatar}
                onbExternalPreview={onbExternalPreview}
                submitting={submitting}
                onComplete={handleComplete}
                onBack={() => goToStep(6)}
              />
            )}
          </div>
        </div>
      </div>

      {currentStep === 4 && (
        <PreviewIslandStep4
          form={form}
          ringColor={ringColor}
          onbInternalPreview={onbInternalPreview}
          onbInternalSns={onbInternalSns}
        />
      )}

      {currentStep === 5 && (
        <PreviewIslandStep5
          form={form}
          ringColor={ringColor}
          allowPublic={allowPublic}
          previewView={previewView}
          setPreviewView={setPreviewView}
          onbInternalPreview={onbInternalPreview}
          onbExternalPreview={onbExternalPreview}
          onbInternalSns={onbInternalSns}
          onbExternalSns={onbExternalSns}
        />
      )}

      {/* 継続メンバー向け会費通知モーダル */}
      <Dialog open={showFeeNotice} onOpenChange={() => {}}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="[&>button:last-child]:hidden"
        >
          <DialogHeader>
            <DialogTitle>継続メンバーの皆さまへ</DialogTitle>
            <DialogDescription className="text-balance">
              今年度もLumosでの活動を続けてくださり、ありがとうございます！
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">
            <p>
              年会費は <span className="font-bold">3,000円</span>{" "}
              です。5月頃に対面で集金します。
              <br />
              (詳細は後日アナウンス予定)
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              ※卒業生の方は対象外です。
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowFeeNotice(false)}>確認した</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
