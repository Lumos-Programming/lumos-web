import { auth } from '@/lib/auth'
import { getMember, isOnboardingComplete } from '@/lib/members'
import { redirect } from 'next/navigation'
import OnboardingForm from '@/components/onboarding-form'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await getMember(session.user.id)
  if (member && isOnboardingComplete(member)) {
    redirect('/internal')
  }

  return <OnboardingForm />
}
