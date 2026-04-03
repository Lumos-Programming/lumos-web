import { auth } from "@/lib/auth"
import { getMember } from "@/lib/members"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { BioSection, InterestsSection } from "@/components/member-detail-shared"
import { SnsChipsSection } from "@/components/sns-chips"
import { getRingColorClass } from "@/types/member"
import type { Member } from "@/types/member"

function formatBirthDate(d: string) {
  const parts = d.split("-")
  if (parts.length >= 3) return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
  return d
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/api/auth/signin")

  const member = await getMember(session.user.id)

  const avatarUrl = member?.faceImage
    || (member?.discordAvatar?.startsWith("http")
      ? member.discordAvatar
      : member?.discordAvatar
        ? `https://cdn.discordapp.com/avatars/${session.user.id}/${member.discordAvatar}.png`
        : "/placeholder.svg")

  const displayName = member?.nickname || member?.discordUsername || "未設定"
  const ringClass = getRingColorClass(member?.ringColor)

  const social: Member["social"] = member ? {
    github: member.github ? `https://github.com/${member.github}` : undefined,
    x: member.x ? `https://x.com/${member.x}` : undefined,
    discord: member.discordUsername || undefined,
    linkedin: member.linkedin || undefined,
  } : undefined

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="プロフィール"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/internal/settings">SNS連携設定</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/internal/profile/edit">編集</Link>
            </Button>
          </>
        }
      />

      {member ? (
        <div className="space-y-4">
          {/* Header Card */}
          <Card className="stagger-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-backwards overflow-visible">
            <div className="relative h-28 bg-gradient-primary rounded-t-xl">
              <div className="absolute -bottom-10 left-6">
                <div className={`w-20 h-20 relative rounded-full overflow-hidden ring-4 ring-card ${ringClass} shrink-0 shadow-lg bg-card`}>
                  <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-12 sm:pt-2 sm:pl-32">
              <div className="pt-1">
                <h2 className="text-xl font-bold">{displayName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {member.discordUsername && member.nickname && member.nickname !== member.discordUsername && (
                    <span className="text-sm text-muted-foreground">{member.discordUsername}</span>
                  )}
                  {member.memberType && (
                    <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {member.memberType}
                    </span>
                  )}
                  {member.role && (
                    <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Basic Info */}
          <Card className="stagger-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-backwards">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">氏名</p>
                  <p className="text-sm font-medium mt-0.5">
                    {member.lastName || member.firstName
                      ? `${member.lastName} ${member.firstName}`
                      : "未設定"}
                  </p>
                </div>
                {(member.lastNameRomaji || member.firstNameRomaji) && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">氏名（ローマ字）</p>
                    <p className="text-sm font-medium mt-0.5">{`${member.lastNameRomaji || ""} ${member.firstNameRomaji || ""}`.trim()}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">種別</p>
                  <p className="text-sm font-medium mt-0.5">{member.memberType || "未設定"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">学籍番号</p>
                  <p className="text-sm font-medium mt-0.5">{member.studentId || "未設定"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">学部/学府</p>
                  <p className="text-sm font-medium mt-0.5">{member.enrollments?.find(e => e.isCurrent)?.faculty || "未設定"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">学年</p>
                  <p className="text-sm font-medium mt-0.5">{member.yearByFiscal?.[String(new Date().getFullYear())] || "未設定"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">誕生日</p>
                  <p className="text-sm font-medium mt-0.5">{member.birthDate ? formatBirthDate(member.birthDate) : "未設定"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">役職</p>
                  <p className="text-sm font-medium mt-0.5">{member.role || "未設定"}</p>
                </div>
                {member.memberType === "卒業生" && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">現在の所属</p>
                    <p className="text-sm font-medium mt-0.5">{member.currentOrg || "未設定"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card className="stagger-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-backwards">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">プロフィール文</CardTitle>
            </CardHeader>
            <CardContent>
              <BioSection bio={member.bio} />
            </CardContent>
          </Card>

          {/* Interests */}
          <Card className="stagger-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-backwards">
            <CardContent className="pt-6">
              {member.interests && member.interests.length > 0 ? (
                <InterestsSection interests={member.interests} />
              ) : (
                <>
                  <h3 className="text-sm font-semibold mb-2">興味分野</h3>
                  <p className="text-sm text-muted-foreground">まだ何も登録されていません。<Link href="/internal/profile/edit" className="text-primary hover:underline">登録しよう!</Link></p>
                </>
              )}
            </CardContent>
          </Card>

          {/* SNS */}
          {social && (
            <Card className="stagger-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-backwards">
              <CardContent className="pt-6">
                <SnsChipsSection social={social} />
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">プロフィールが見つかりません。</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
