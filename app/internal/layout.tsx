import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) {
    redirect('/')
  }
  return <div className="pt-20">{children}</div>
}
