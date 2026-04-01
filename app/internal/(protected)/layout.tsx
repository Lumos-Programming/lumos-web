import { auth } from '@/lib/auth'
import { getMember, isOnboardingComplete } from '@/lib/members'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await getMember(session.user.id)
  if (!member || !isOnboardingComplete(member)) {
    redirect('/internal/onboarding')
  }

  return <>{children}</>
}
