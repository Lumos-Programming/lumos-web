import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMember, updateMember } from "@/lib/members"

const VISIBILITY_KEYS = [
  "studentId", "nickname", "lastName", "firstName",
  "faculty", "bio", "line", "github", "x",
] as const

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

    // Normalize visibility: only accept known boolean keys, default missing ones to false
    const rawVis = body.visibility ?? {}
    const visibility = Object.fromEntries(
      VISIBILITY_KEYS.map((key) => [key, rawVis[key] === true])
    ) as Record<typeof VISIBILITY_KEYS[number], boolean>

    // Build update payload, omitting undefined optional fields so Firestore doesn't reject them
    const data: Parameters<typeof updateMember>[1] = {
      studentId: typeof body.studentId === "string" ? body.studentId : "",
      nickname:  typeof body.nickname  === "string" ? body.nickname  : "",
      lastName:  typeof body.lastName  === "string" ? body.lastName  : "",
      firstName: typeof body.firstName === "string" ? body.firstName : "",
      faculty:   typeof body.faculty   === "string" ? body.faculty   : "",
      bio:       typeof body.bio       === "string" ? body.bio       : "",
      visibility,
    }

    if (typeof body.role   === "string") data.role   = body.role
    if (typeof body.year   === "string") data.year   = body.year
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
