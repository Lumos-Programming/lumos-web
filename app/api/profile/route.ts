import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMember, updateMember } from "@/lib/members"
import type { VisibilityLevel, MemberType, EnrollmentRecord, EnrollmentType } from "@/types/profile"
import { MEMBER_TYPES, ENROLLMENT_TYPES } from "@/types/profile"

const VISIBILITY_KEYS = [
  "studentId", "nickname", "lastName", "firstName",
  "faculty", "currentOrg", "birthDate", "bio", "line", "github", "x", "linkedin", "discord",
] as const

const VISIBILITY_LEVELS: VisibilityLevel[] = ["private", "internal", "public"]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await getMember(session.user.id)
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ...member, discordId: session.user.id })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const rawVis = body.visibility ?? {}
    const visibility = Object.fromEntries(
      VISIBILITY_KEYS.map((key) => {
        let level: VisibilityLevel = VISIBILITY_LEVELS.includes(rawVis[key]) ? rawVis[key] : "private"
        // studentId は常に private 固定
        if (key === "studentId") level = "private"
        // line, birthDate は最大 internal（public 不可）
        if ((key === "line" || key === "birthDate") && level === "public") level = "internal"
        // discord は最低 internal（private 不可）
        if (key === "discord" && level === "private") level = "internal"
        return [key, level]
      })
    ) as Record<typeof VISIBILITY_KEYS[number], VisibilityLevel>

    const data: Parameters<typeof updateMember>[1] = {
      visibility,
    }

    // 文字列フィールドは送信された場合のみ更新（未送信時に空文字で上書きしない）
    if (typeof body.studentId === "string") data.studentId = body.studentId
    if (typeof body.nickname  === "string") data.nickname  = body.nickname
    if (typeof body.lastName  === "string") data.lastName  = body.lastName
    if (typeof body.firstName === "string") data.firstName = body.firstName
    if (typeof body.lastNameRomaji  === "string") data.lastNameRomaji  = body.lastNameRomaji
    if (typeof body.firstNameRomaji === "string") data.firstNameRomaji = body.firstNameRomaji
    if (typeof body.bio       === "string") data.bio       = body.bio

    if (MEMBER_TYPES.includes(body.memberType)) data.memberType = body.memberType as MemberType
    if (typeof body.currentOrg === "string") data.currentOrg = body.currentOrg
    if (typeof body.birthDate === "string") data.birthDate = body.birthDate
    if (typeof body.allowPublic === "boolean") data.allowPublic = body.allowPublic

    if (Array.isArray(body.enrollments)) {
      data.enrollments = body.enrollments.map((e: unknown) => {
        const entry = e as Record<string, unknown>
        const record: EnrollmentRecord = {
          faculty: typeof entry.faculty === "string" ? entry.faculty : "",
          admissionYear: typeof entry.admissionYear === "string" ? entry.admissionYear : "",
          enrollmentType: ENROLLMENT_TYPES.includes(entry.enrollmentType as EnrollmentType)
            ? entry.enrollmentType as EnrollmentType
            : "入学",
          isCurrent: entry.isCurrent === true,
        }
        if (typeof entry.transferYear === "string" && entry.transferYear) {
          record.transferYear = entry.transferYear
        }
        return record
      })
    }

    if (typeof body.role === "string") data.role = body.role
    if (
      typeof body.yearByFiscal === "object" &&
      body.yearByFiscal !== null &&
      !Array.isArray(body.yearByFiscal) &&
      Object.values(body.yearByFiscal).every((v) => typeof v === "string")
    ) {
      data.yearByFiscal = body.yearByFiscal as Record<string, string>
    }
    if (Array.isArray(body.skills) && body.skills.every((s: unknown) => typeof s === "string")) {
      data.skills = body.skills
    }
    const VALID_PRIMARY_AVATARS = ["face", "discord", "line", "default"] as const
    if (typeof body.primaryAvatar === "string" && (VALID_PRIMARY_AVATARS as readonly string[]).includes(body.primaryAvatar)) {
      data.primaryAvatar = body.primaryAvatar as typeof VALID_PRIMARY_AVATARS[number]
    }
    const VALID_RING_COLORS = ["purple","blue","green","pink","orange","red","teal","amber","rose","indigo"]
    if (typeof body.ringColor === "string" && VALID_RING_COLORS.includes(body.ringColor)) {
      data.ringColor = body.ringColor
    }

    await updateMember(session.user.id, data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
