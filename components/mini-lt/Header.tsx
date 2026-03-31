import Link from 'next/link'
import Image from 'next/image'
import { auth, isAdmin } from '@/lib/auth'

export async function Header() {
  const session = await auth()
  const userIsAdmin = session ? await isAdmin() : false

  return (
    <header className="bg-gradient-primary animate-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
      <div className="container mx-auto px-4 py-6 max-w-5xl relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex-1">
            <div className="text-center text-white cursor-pointer hover:opacity-90 transition-opacity">
              {/* Lumos Logo Area */}
              <div className="flex items-center justify-center mb-3">
                <div className="bg-white backdrop-blur-sm py-0 px-3 rounded-xl border border-white/30">
                  <div className="flex items-center gap-2">
                    <Image
                      width={100}
                      height={100}
                      src="/lumos-logo.webp"
                      alt="Lumos Logo"
                      className="w-10 h-10"
                    />
                    <span className="text-xl text-[#273C5A] font-bold">Lumos</span>
                  </div>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold mb-1 tracking-tight">
                Mini LT プロジェクト
              </h1>
              <p className="text-sm text-white/90">
                ☕️ カジュアルに最近取り組んでいることを共有してみよう!
              </p>
            </div>
          </Link>

          {userIsAdmin && (
            <div className="hidden md:block">
              <Link href="/mini-lt/admin">
                <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all text-white text-sm font-semibold border border-white/20">
                  ⚙️ Admin
                </div>
              </Link>
            </div>
          )}
        </div>

        {userIsAdmin && (
          <div className="md:hidden mt-4 text-center">
            <Link href="/mini-lt/admin">
              <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all text-white text-sm font-semibold border border-white/20 inline-block">
                ⚙️ Admin Dashboard
              </div>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
