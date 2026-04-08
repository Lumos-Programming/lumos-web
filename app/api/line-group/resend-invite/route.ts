import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMember } from "@/lib/members";
import {
  checkLineGroupMembership,
  createLineInvitation,
  sendLineGroupInviteDM,
} from "@/lib/line-invite";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMember(session.user.id);
  if (!member?.lineId) {
    return NextResponse.json(
      { error: "LINE account not linked" },
      { status: 400 },
    );
  }

  const inGroup = await checkLineGroupMembership(member.lineId);
  if (inGroup) {
    return NextResponse.json(
      { error: "Already a group member" },
      { status: 400 },
    );
  }

  // 新しい招待コードを発行（既存の未使用コードはcreateLineInvitation内で無効化される）
  const { redirectUrl } = await createLineInvitation(
    session.user.id,
    member.lineId,
  );
  await sendLineGroupInviteDM(member.lineId, redirectUrl);

  return NextResponse.json({ ok: true });
}
