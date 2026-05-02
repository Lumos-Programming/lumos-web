import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMember, updateMember, isOnboardingComplete } from "@/lib/members";
import {
  sendDiscordDm,
  buildOnboardingCompleteMessage,
  calcProfileCompletion,
  notifyAdminChannel,
  buildAdminOnboardingCompletedNotification,
} from "@/lib/discord-dm";
import { checkLineGroupMembership } from "@/lib/line-invite";
import { syncMemberDiscordRoles } from "@/lib/discord-role";

export async function POST() {
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

  const isAlumni = member.memberType === "卒業生";

  if (!isAlumni) {
    if (!member.lineId) {
      return NextResponse.json(
        { error: "LINE account not linked", missing: ["lineId"] },
        { status: 400 },
      );
    }

    try {
      const isInGroup = await checkLineGroupMembership(member.lineId);
      if (!isInGroup) {
        return NextResponse.json(
          { error: "LINE group not joined", missing: ["lineGroup"] },
          { status: 400 },
        );
      }
    } catch (e) {
      console.error("LINE group membership check error during onboarding:", e);
      return NextResponse.json(
        { error: "Failed to verify LINE group membership" },
        { status: 500 },
      );
    }
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

    notifyAdminChannel(
      buildAdminOnboardingCompletedNotification({
        discordId: session.user.id,
        discordUsername: updatedMember.discordUsername,
        nickname: updatedMember.nickname,
        lastName: updatedMember.lastName,
        firstName: updatedMember.firstName,
        memberType: updatedMember.memberType,
      }),
    ).catch((e) => {
      console.error("Failed to notify admin channel (onboarding):", e);
    });

    syncMemberDiscordRoles(session.user.id, {
      year: updatedMember.yearByFiscal?.[String(new Date().getFullYear())],
      faculty: updatedMember.enrollments?.find((e) => e.isCurrent)?.faculty,
    }).catch((e) => {
      console.error("Failed to sync Discord roles (onboarding):", e);
    });
  }

  return NextResponse.json({ success: true });
}
