import { auth } from "@/lib/auth";
import { getMembersInternal } from "@/lib/members";
import { BirthdayList } from "@/components/birthday-list";
import { Cake } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BirthdaysPage() {
  const [session, members] = await Promise.all([auth(), getMembersInternal()]);

  const myBirthDate =
    members.find((m) => m.id === session?.user?.id)?.birthDate ?? null;

  const entries = members
    .filter((m) => m.birthDate)
    .map((m) => ({
      id: m.id,
      name: m.name,
      nickname: m.nickname,
      birthDate: m.birthDate!,
      avatarUrl: m.snsAvatar || m.publicImage || undefined,
    }));

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Cake className="h-6 w-6" />
        <h1 className="text-2xl font-bold">誕生日カレンダー</h1>
        <span className="text-sm text-muted-foreground">
          {entries.length} 件
        </span>
      </div>
      <BirthdayList entries={entries} myBirthDate={myBirthDate} />
    </div>
  );
}
