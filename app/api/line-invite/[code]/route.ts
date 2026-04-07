import { NextRequest, NextResponse } from "next/server";
import { getLineInvitation, checkLineGroupMembership } from "@/lib/line-invite";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const invitation = await getLineInvitation(code);

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 },
    );
  }

  if (invitation.used) {
    return NextResponse.json(
      { error: "Invitation already used" },
      { status: 410 },
    );
  }

  if (invitation.expiresAt.toMillis() < Date.now()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  try {
    const alreadyMember = await checkLineGroupMembership(invitation.lineId);
    if (alreadyMember) {
      return NextResponse.json(
        { error: "Already a group member" },
        { status: 400 },
      );
    }
  } catch {
    // Proceed with redirect even if check fails
  }

  const groupInviteUrl = process.env.LINE_GROUP_INVITE_URL;
  if (!groupInviteUrl) {
    return NextResponse.json(
      { error: "Group invite URL not configured" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(groupInviteUrl, 302);
}
