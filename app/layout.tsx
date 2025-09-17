import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_JP } from "next/font/google"
import "./globals.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
})

export const metadata: Metadata = {
  title: "Lumos | 横浜国立大学プログラミングサークル",
  description:
    "横浜国立大学のプログラミングサークル「Lumos」の公式サイトです。初心者から経験者まで、学習・交流を行っています。",
  generator: "Next.js",
  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    title: "Lumos | 横浜国立大学プログラミングサークル",
    description:
      "横浜国立大学のプログラミングサークル「Lumos」の公式サイトです。初心者から経験者まで、学習・交流を行っています。",
    siteName: "lumosweb",
    url: "https://lumos-ynu.jp/",
    images: [
      {
        url: "https://lumos-ynu.jp/assets/LumosOGP.png",
        type: "image/png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumos | 横浜国立大学プログラミングサークル",
    description:
      "横浜国立大学のプログラミングサークル「Lumos」の公式サイトです。初心者から経験者まで、学習・交流を行っています。",
    images: ["https://lumos-ynu.jp/assets/LumosOGP.png"],
  },
  keywords: ['横国', '横浜国立大学', 'Lumos', 'ルーモス', 'プログラミング', 'サークル', '国大', 'YNU', '初心者', '情報', 'IT'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJP.variable} font-sans min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
