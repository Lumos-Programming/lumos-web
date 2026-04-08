import { NextRequest, NextResponse } from "next/server";
import { validateInvitation, isValidationError } from "../validate";

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

  const supportUrl = process.env.LINE_INVITE_SUPPORT_URL;
  if (!supportUrl) {
    return NextResponse.redirect(
      new URL(`${ERROR_PAGE}?reason=not_configured`, origin),
    );
  }

  return NextResponse.redirect(supportUrl, 302);
}
