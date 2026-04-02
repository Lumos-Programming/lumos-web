import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMember, updateMember } from "@/lib/members"
import { uploadToGCS, validateImageUpload, UploadValidationError } from "@/lib/upload"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const discordId = session.user.id

  const member = await getMember(discordId)
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("image") as File | null
    if (!file) {
      return NextResponse.json({ error: "画像が選択されていません" }, { status: 400 })
    }

    const buffer = await validateImageUpload(file)

    const url = await uploadToGCS(buffer, `profiles/${randomUUID()}.webp`, {
      contentType: file.type,
    })

    await updateMember(discordId, { faceImage: url })

    return NextResponse.json({ url })
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Failed to upload profile image:", error)
    return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 })
  }
}
