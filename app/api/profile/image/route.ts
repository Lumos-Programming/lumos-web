import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMember, updateMember } from "@/lib/members"
import { uploadToGCS, validateImageUpload, UploadValidationError } from "@/lib/upload"
import { FieldValue } from "firebase-admin/firestore"
import { getDb } from "@/lib/firebase"

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

    const type = (formData.get("type") as string) || "face"
    if (type !== "face" && type !== "banner") {
      return NextResponse.json({ error: "無効な画像タイプです" }, { status: 400 })
    }

    const maxBytes = type === "banner" ? 5 * 1024 * 1024 : 2 * 1024 * 1024
    const buffer = await validateImageUpload(file, { maxBytes })

    const folder = type === "banner" ? "banners" : "profiles"
    const field = type === "banner" ? "bannerImage" : "faceImage"

    const url = await uploadToGCS(buffer, `${folder}/${randomUUID()}.webp`, {
      contentType: file.type,
    })

    await updateMember(discordId, { [field]: url })

    return NextResponse.json({ url })
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Failed to upload profile image:", error)
    return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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
    const { type } = await request.json()
    if (type !== "banner") {
      return NextResponse.json({ error: "無効な画像タイプです" }, { status: 400 })
    }

    const db = getDb()
    await db.collection("members").doc(discordId).update({
      bannerImage: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete image:", error)
    return NextResponse.json({ error: "画像の削除に失敗しました" }, { status: 500 })
  }
}
