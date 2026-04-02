import { auth } from "@/lib/auth"
import { getMember } from "@/lib/members"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function formatBirthDate(d: string) {
  const parts = d.split("-")
  if (parts.length >= 3) return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
  return d
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/api/auth/signin")

  const member = await getMember(session.user.id)

  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">プロフィール</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/internal/settings">SNS連携設定</Link>
            </Button>
            <Button asChild>
              <Link href="/internal/profile/edit">プロフィールを編集</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              {member?.discordAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://cdn.discordapp.com/avatars/${session.user.id}/${member.discordAvatar}.png`}
                  alt="Discord avatar"
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <p className="text-lg font-semibold">
                  {member?.nickname || member?.discordUsername || "未設定"}
                </p>
                <p className="text-sm text-gray-500">{member?.discordUsername}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {member ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">学籍番号</p>
                  <p className="text-sm">{member.studentId || "未設定"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">氏名</p>
                  <p className="text-sm">
                    {member.lastName || member.firstName
                      ? `${member.lastName} ${member.firstName}`
                      : "未設定"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">学部/学府</p>
                  <p className="text-sm">{member.enrollments?.find(e => e.isCurrent)?.faculty || "未設定"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">学年</p>
                  <p className="text-sm">{member.yearByFiscal?.[String(new Date().getFullYear())] || "未設定"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">誕生日</p>
                  <p className="text-sm">{member.birthDate ? formatBirthDate(member.birthDate) : "未設定"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">役職</p>
                  <p className="text-sm">{member.role || "未設定"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500">自己紹介</p>
                  <p className="text-sm whitespace-pre-wrap">{member.bio || "未設定"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">GitHub</p>
                  <p className="text-sm">{member.github || "未連携"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">X</p>
                  <p className="text-sm">{member.x || "未連携"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">LINE</p>
                  <p className="text-sm">{member.line || "未連携"}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">プロフィールが見つかりません。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
