import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function OnboardingCompletePage() {
  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <h1 className="text-2xl font-bold">登録が完了しました！</h1>
            <p className="text-muted-foreground">
              プロフィールの登録が完了しました。メンバーページをご利用いただけます。
            </p>
            <Button asChild className="mt-4">
              <Link href="/internal">ダッシュボードへ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
