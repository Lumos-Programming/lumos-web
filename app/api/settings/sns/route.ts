import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateMemberSns, deleteMemberSnsField } from "@/lib/members";
import { normalizeLinkedInUrl } from "@/lib/linkedin";

export async function PUT(request: Request) {
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

  try {
    const body = await request.json();
    const allowed = [
      "github",
      "githubId",
      "x",
      "xId",
      "linkedin",
      "line",
      "lineId",
    ] as const;
    type SnsKey = (typeof allowed)[number];

    const data: Partial<Record<SnsKey, string>> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    // Validate and normalize LinkedIn URL
    if ("linkedin" in data && data.linkedin) {
      const normalized = normalizeLinkedInUrl(data.linkedin);
      if (!normalized) {
        return NextResponse.json(
          { error: "Invalid LinkedIn URL" },
          { status: 400 },
        );
      }
      data.linkedin = normalized;
    }

    await updateMemberSns(session.user.id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update SNS settings:", error);
    return NextResponse.json(
      { error: "Failed to update SNS settings" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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

  try {
    const { provider } = await request.json();
    if (!["github", "x", "linkedin"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await deleteMemberSnsField(session.user.id, provider);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete SNS connection:", error);
    return NextResponse.json(
      { error: "Failed to delete SNS connection" },
      { status: 500 },
    );
  }
}
