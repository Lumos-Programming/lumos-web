import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMember, updateMember, isOnboardingComplete } from "@/lib/members";
import {
  sendDiscordDm,
  buildOnboardingCompleteMessage,
  calcProfileCompletion,
} from "@/lib/discord-dm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMember(session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (isOnboardingComplete(member)) {
    return NextResponse.json({ error: "Already completed" }, { status: 400 });
  }

  const hasFaculty = member.enrollments?.some((e) => e.isCurrent && e.faculty);
  const missing: string[] = [];
  if (!member.studentId) missing.push("studentId");
  if (!member.lastName) missing.push("lastName");
  if (!member.firstName) missing.push("firstName");
  if (!member.lastNameRomaji) missing.push("lastNameRomaji");
  if (!member.firstNameRomaji) missing.push("firstNameRomaji");
  if (!hasFaculty) missing.push("faculty");
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Missing required fields", missing },
      { status: 400 },
    );
  }

  if (!member.lineId) {
    return NextResponse.json(
      { error: "LINE account not linked" },
      { status: 400 },
    );
  }

  await updateMember(session.user.id, {
    onboardingCompleted: true,
  });

  // Send onboarding complete DM (fire-and-forget)
  const updatedMember = await getMember(session.user.id);
  if (updatedMember) {
    const completion = calcProfileCompletion(updatedMember);
    const payload = buildOnboardingCompleteMessage(
      updatedMember.discordUsername,
      completion,
    );
    sendDiscordDm(session.user.id, payload).catch((e) => {
      console.error("Failed to send onboarding complete DM:", e);
    });
  }

  return NextResponse.json({ success: true });
}
