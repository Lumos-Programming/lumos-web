import { NextResponse } from "next/server"
import { getDb } from "@/lib/firebase"
import type { Profile } from "@/types/profile"

// TODO: Replace with actual session userId once auth is implemented
const userId = "placeholder"

export async function GET() {
  // TODO: Wire up auth to get the real userId from the session
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function PUT(request: Request) {
  try {
    const body: Profile = await request.json()

    const db = getDb()
    await db.collection("profiles").doc(userId).set({
      studentId: body.studentId,
      nickname: body.nickname,
      lastName: body.lastName,
      firstName: body.firstName,
      faculty: body.faculty,
      bio: body.bio,
      line: body.line,
      discord: body.discord,
      github: body.github,
      visibility: body.visibility,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
