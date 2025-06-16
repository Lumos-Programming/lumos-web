import Link from "next/link"
import { Github, Twitter,Instagram } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-primary text-white py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Lumos</h3>
            <p className="text-sm text-gray-300">
              横浜国立大学のプログラミングサークル。<br />
              プログラミングやデータサイエンスなど、広くITに関心のある人が集まり、交流・学習を行っています。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">リンク</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  サークル紹介
                </Link>
              </li>
              {/*
              <li>
                <Link href="/members" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  メンバー
                </Link>
              </li>
              */}
              <li>
                <Link href="/news" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  お知らせ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">フォローする</h3>
            <div className="flex space-x-4">
              <Link
                href="https://x.com/lumos_program"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-accent transition-colors"
                aria-label="X(Twitter)  "
              >
                <Twitter className="h-6 w-6" />
              </Link>
              <Link
                href="https://github.com/lumos-ynu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-accent transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-6 w-6" />
              </Link>
              <Link
                href="https://www.instagram.com/lumos_programming"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-accent transition-colors"
                aria-label="Instagram"
>
                <Instagram className="h-6 w-6" />
              </Link>

            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            &copy; {new Date().getFullYear()} Lumos - 横浜国立大学プログラミングサークル
          </p>
        </div>
      </div>
    </footer>
  )
}
