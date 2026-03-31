import { NextResponse } from "next/server"
import { getDb } from "@/lib/firebase"
import type { Event } from "@/types/event"

export async function GET() {
  try {
    const db = getDb()
    const snapshot = await db.collection("events").orderBy("date", "desc").get()

    const events: Event[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Event, "id">),
    }))

    return NextResponse.json(events)
  } catch (error) {
    console.error("Failed to fetch events:", error)
    // Return empty array as fallback
    return NextResponse.json([])
  }
}
