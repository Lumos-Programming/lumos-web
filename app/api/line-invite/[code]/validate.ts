import { NextResponse } from "next/server";
import { getLineInvitation, type LineInvitation } from "@/lib/line-invite";

type ValidationSuccess = { invitation: LineInvitation };
type ValidationError = { response: NextResponse };

const ERROR_PAGE = "/error/line-invite";

function errorRedirect(origin: string, reason: string): NextResponse {
  return NextResponse.redirect(
    new URL(`${ERROR_PAGE}?reason=${reason}`, origin),
  );
}

export async function validateInvitation(
  code: string,
  origin: string,
): Promise<ValidationSuccess | ValidationError> {
  const invitation = await getLineInvitation(code);

  if (!invitation) {
    return { response: errorRedirect(origin, "not_found") };
  }

  if (invitation.used) {
    return { response: errorRedirect(origin, "used") };
  }

  if (invitation.expiresAt.toMillis() < Date.now()) {
    return { response: errorRedirect(origin, "expired") };
  }

  return { invitation };
}

export function isValidationError(
  result: ValidationSuccess | ValidationError,
): result is ValidationError {
  return "response" in result;
}
