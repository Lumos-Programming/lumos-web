import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMember, updateMember } from "@/lib/members"
import type { VisibilityLevel, MemberType, EnrollmentRecord, EnrollmentType } from "@/types/profile"
import { MEMBER_TYPES, ENROLLMENT_TYPES } from "@/types/profile"

const VISIBILITY_KEYS = [
  "studentId", "nickname", "lastName", "firstName",
  "faculty", "currentOrg", "birthDate", "bio", "line", "github", "x", "discord",
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

  return NextResponse.json(member)
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
      studentId: typeof body.studentId === "string" ? body.studentId : "",
      nickname:  typeof body.nickname  === "string" ? body.nickname  : "",
      lastName:  typeof body.lastName  === "string" ? body.lastName  : "",
      firstName: typeof body.firstName === "string" ? body.firstName : "",
      bio:       typeof body.bio       === "string" ? body.bio       : "",
      visibility,
    }

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

    await updateMember(session.user.id, data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
