import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMember } from "@/lib/members";
import { checkLineGroupMembership } from "@/lib/line-invite";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.optedOut) {
    return NextResponse.json(
      { error: "退会済みアカウントでは操作できません" },
      { status: 403 },
    );
  }

  const member = await getMember(session.user.id);
  if (!member?.lineId) {
    return NextResponse.json(
      { error: "LINE account not linked" },
      { status: 400 },
    );
  }

  try {
    const isMember = await checkLineGroupMembership(member.lineId);
    return NextResponse.json({ isMember });
  } catch (e) {
    console.error("LINE group membership check error:", e);
    return NextResponse.json(
      { error: "Failed to check membership" },
      { status: 500 },
    );
  }
}
