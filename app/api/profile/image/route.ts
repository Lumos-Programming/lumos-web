import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getStorageBucket } from "@/lib/firebase"
import { getMember, updateMember } from "@/lib/members"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

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
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    if (file.type !== "image/webp") {
      return NextResponse.json({ error: "Only WebP format is accepted" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 2MB limit" }, { status: 400 })
    }

    // Emulator mode: skip GCS upload, use mock URL
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const mockUrl = "/placeholder.svg"
      await updateMember(discordId, { faceImage: mockUrl })
      return NextResponse.json({ url: mockUrl })
    }

    // Upload to GCS
    const bucket = getStorageBucket()
    const gcsPath = `profiles/${discordId}.webp`
    const gcsFile = bucket.file(gcsPath)

    const buffer = Buffer.from(await file.arrayBuffer())

    await gcsFile.save(buffer, {
      contentType: "image/webp",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    })

    await gcsFile.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`

    await updateMember(discordId, { faceImage: publicUrl })

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Failed to upload profile image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
