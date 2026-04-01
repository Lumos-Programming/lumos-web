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

  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">プロフィール登録</h1>
          <p className="text-muted-foreground">
            メンバーページを利用するために、基本情報を登録してください。
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
