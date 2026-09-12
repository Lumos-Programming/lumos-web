import type { Member } from "@/types/member";
import { getJstToday, isBirthdayToday, type JstToday } from "@/lib/date";

type BirthdayMember = Pick<Member, "name" | "nickname" | "birthDate">;

export function getTodayBirthdayNames(
  members: BirthdayMember[],
  today: JstToday = getJstToday(),
): string[] {
  return members
    .filter(
      (member) =>
        member.birthDate !== undefined &&
        isBirthdayToday(member.birthDate, today),
    )
    .map((member) => member.nickname || member.name);
}
