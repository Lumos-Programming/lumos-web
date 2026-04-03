import { auth } from '@/lib/auth'
import { getMember, isOnboardingComplete } from '@/lib/members'
import { redirect } from 'next/navigation'
import { InternalShell } from '@/components/internal-shell'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await getMember(session.user.id)
  if (!member || !isOnboardingComplete(member)) {
    redirect('/internal/onboarding')
  }

  return (
    <InternalShell
      userName={session.user.name || ""}
      userImage={session.user.image || undefined}
      memberNickname={member.nickname || undefined}
      memberRole={member.role || undefined}
    >
      {children}
    </InternalShell>
  )
}
