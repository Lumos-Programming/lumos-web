import Link from "next/link";
import { Github, Instagram } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gradient-primary text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Lumos</h3>
            <p className="text-sm text-white/80">
              横浜国立大学のプログラミングサークル。
              <br />
              プログラミングやデータサイエンスなど、広くITに関心のある人が集まり、交流・学習を行っています。
            </p>
            <p className="text-sm text-white/80 mt-4 break-all">
              お問い合わせ先： lumos.ynu.programming@gmail.com
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">リンク</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  ホーム
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  サークル紹介
                </Link>
              </li>
              {/*
              <li>
                <Link href="/members" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  メンバー
                </Link>
              </li>
              */}
              <li>
                <Link
                  href="/projects"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  プロジェクト紹介
                </Link>
              </li>
              <li>
                <Link
                  href="/news"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  お知らせ
                </Link>
              </li>
              {/*
              <li>
                <Link href="/contact" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  お問い合わせ
                </Link>
              </li>
              */}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">フォローする</h3>
            <div className="flex space-x-4">
              <Link
                href="https://x.com/lumos_program"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/80 transition-colors"
                aria-label="X"
              >
                <Image src="./x.svg" alt="X" width={25} height={25} />
              </Link>
              <Link
                href="https://github.com/Lumos-Programming"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/80 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-6 w-6" />
              </Link>
              <Link
                href="https://www.instagram.com/lumos_programming"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/80 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm text-white/60 text-center">
            &copy; {new Date().getFullYear()} Lumos -
            横浜国立大学プログラミングサークル
          </p>
        </div>
      </div>
    </footer>
  );
}
