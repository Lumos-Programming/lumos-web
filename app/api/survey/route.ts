import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { satisfaction, satisfactionReason, expectations } = body;

  if (
    typeof satisfaction !== "number" ||
    satisfaction < 1 ||
    satisfaction > 5
  ) {
    return NextResponse.json(
      { error: "satisfaction must be 1-5" },
      { status: 400 },
    );
  }

  const db = getDb();
  const docId = `${session.user.id}_onboarding_2025`;

  await db
    .collection("surveys")
    .doc(docId)
    .set({
      discordId: session.user.id,
      type: "onboarding_2025",
      satisfaction,
      ...(satisfactionReason ? { satisfactionReason } : {}),
      ...(expectations ? { expectations } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ success: true });
}
