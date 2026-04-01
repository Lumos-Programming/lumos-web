import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMember, updateMember } from "@/lib/members"

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

    // Only allow updating non-SNS profile fields
    await updateMember(session.user.id, {
      studentId: body.studentId,
      nickname: body.nickname,
      lastName: body.lastName,
      firstName: body.firstName,
      faculty: body.faculty,
      bio: body.bio,
      role: body.role,
      year: body.year,
      skills: body.skills,
      visibility: body.visibility,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
