import { NextRequest, NextResponse } from "next/server";
import { checkLineGroupMembership } from "@/lib/line-invite";
import { validateInvitation, isValidationError } from "./validate";

const ERROR_PAGE = "/error/line-invite";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const origin = process.env.AUTH_URL ?? request.nextUrl.origin;
  const result = await validateInvitation(code, origin);

  if (isValidationError(result)) {
    return result.response;
  }

  try {
    const alreadyMember = await checkLineGroupMembership(
      result.invitation.lineId,
    );
    if (alreadyMember) {
      return NextResponse.redirect(
        new URL(`${ERROR_PAGE}?reason=already_member`, origin),
      );
    }
  } catch {
    // Proceed with redirect even if check fails
  }

  const groupInviteUrl = process.env.LINE_GROUP_INVITE_URL;
  if (!groupInviteUrl) {
    return NextResponse.redirect(
      new URL(`${ERROR_PAGE}?reason=not_configured`, origin),
    );
  }

  return NextResponse.redirect(groupInviteUrl, 302);
}
