import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMember, updateMember, PUBLIC_IMAGE_OPTIONS } from "@/lib/members";
import type {
  VisibilityLevel,
  MemberType,
  EnrollmentRecord,
  EnrollmentType,
} from "@/types/profile";
import {
  MEMBER_TYPES,
  ENROLLMENT_TYPES,
  GENDER_OPTIONS,
} from "@/types/profile";
import { isValidTag, MAX_TAGS, MAX_TOP_INTERESTS } from "@/types/interests";

const VISIBILITY_KEYS = [
  "studentId",
  "nickname",
  "lastName",
  "firstName",
  "faculty",
  "currentOrg",
  "birthDate",
  "gender",
  "bio",
  "line",
  "github",
  "x",
  "linkedin",
  "discord",
] as const;

const VISIBILITY_LEVELS: VisibilityLevel[] = ["private", "internal", "public"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMember(session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...member, discordId: session.user.id });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const rawVis = body.visibility ?? {};
    const visibility = Object.fromEntries(
      VISIBILITY_KEYS.map((key) => {
        let level: VisibilityLevel = VISIBILITY_LEVELS.includes(rawVis[key])
          ? rawVis[key]
          : "private";
        // studentId は常に private 固定
        if (key === "studentId") level = "private";
        // line, birthDate は最大 internal（public 不可）
        if ((key === "line" || key === "birthDate") && level === "public")
          level = "internal";
        // discord は最低 internal（private 不可）
        if (key === "discord" && level === "private") level = "internal";
        return [key, level];
      }),
    ) as Record<(typeof VISIBILITY_KEYS)[number], VisibilityLevel>;

    const data: Parameters<typeof updateMember>[1] = {
      visibility,
    };

    // 文字列フィールドは送信された場合のみ更新（未送信時に空文字で上書きしない）
    if (typeof body.studentId === "string") data.studentId = body.studentId;
    if (typeof body.nickname === "string") data.nickname = body.nickname;
    if (typeof body.lastName === "string") data.lastName = body.lastName;
    if (typeof body.firstName === "string") data.firstName = body.firstName;
    if (typeof body.lastNameRomaji === "string")
      data.lastNameRomaji = body.lastNameRomaji;
    if (typeof body.firstNameRomaji === "string")
      data.firstNameRomaji = body.firstNameRomaji;
    if (typeof body.bio === "string") data.bio = body.bio;

    if (MEMBER_TYPES.includes(body.memberType))
      data.memberType = body.memberType as MemberType;
    if (typeof body.currentOrg === "string") data.currentOrg = body.currentOrg;
    if (typeof body.birthDate === "string") data.birthDate = body.birthDate;
    if (
      typeof body.gender === "string" &&
      (body.gender === "" ||
        (GENDER_OPTIONS as readonly string[]).includes(body.gender))
    ) {
      data.gender = body.gender;
    }
    if (typeof body.allowPublic === "boolean")
      data.allowPublic = body.allowPublic;

    if (Array.isArray(body.enrollments)) {
      data.enrollments = body.enrollments.map((e: unknown) => {
        const entry = e as Record<string, unknown>;
        const record: EnrollmentRecord = {
          faculty: typeof entry.faculty === "string" ? entry.faculty : "",
          admissionYear:
            typeof entry.admissionYear === "string" ? entry.admissionYear : "",
          enrollmentType: ENROLLMENT_TYPES.includes(
            entry.enrollmentType as EnrollmentType,
          )
            ? (entry.enrollmentType as EnrollmentType)
            : "入学",
          isCurrent: entry.isCurrent === true,
        };
        if (typeof entry.transferYear === "string" && entry.transferYear) {
          record.transferYear = entry.transferYear;
        }
        if (typeof entry.graduationYear === "string" && entry.graduationYear) {
          record.graduationYear = entry.graduationYear;
        }
        return record;
      });
    }

    if (typeof body.role === "string") data.role = body.role;
    if (
      typeof body.yearByFiscal === "object" &&
      body.yearByFiscal !== null &&
      !Array.isArray(body.yearByFiscal) &&
      Object.values(body.yearByFiscal).every((v) => typeof v === "string")
    ) {
      data.yearByFiscal = body.yearByFiscal as Record<string, string>;
    }
    if (
      typeof body.publicImageOption === "string" &&
      (PUBLIC_IMAGE_OPTIONS as readonly string[]).includes(
        body.publicImageOption,
      )
    ) {
      data.publicImageOption =
        body.publicImageOption as (typeof PUBLIC_IMAGE_OPTIONS)[number];
    }
    const VALID_RING_COLORS = [
      "purple",
      "blue",
      "green",
      "pink",
      "orange",
      "red",
      "teal",
      "amber",
      "rose",
      "indigo",
    ];
    if (
      typeof body.ringColor === "string" &&
      VALID_RING_COLORS.includes(body.ringColor)
    ) {
      data.ringColor = body.ringColor;
    }
    if (
      Array.isArray(body.interests) &&
      body.interests.every((s: unknown) => typeof s === "string")
    ) {
      data.interests = (body.interests as string[])
        .filter(isValidTag)
        .slice(0, MAX_TAGS);
    }
    if (
      Array.isArray(body.topInterests) &&
      body.topInterests.every((s: unknown) => typeof s === "string")
    ) {
      const validInterests = data.interests ?? [];
      data.topInterests = (body.topInterests as string[])
        .filter((t) => isValidTag(t) && validInterests.includes(t))
        .slice(0, MAX_TOP_INTERESTS);
    }

    await updateMember(session.user.id, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
