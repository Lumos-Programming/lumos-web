import type React from "react";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { DevWarning } from "@/components/dev-warning";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

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
        url: "https://lumos-ynu.jp/assets/LumosOGP.webp",
        type: "image/webp",
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
    images: ["https://lumos-ynu.jp/assets/LumosOGP.webp"],
  },
  keywords: [
    "横国",
    "横浜国立大学",
    "Lumos",
    "ルーモス",
    "プログラミング",
    "サークル",
    "国大",
    "YNU",
    "初心者",
    "情報",
    "IT",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"light";if(t==="system")t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${notoSansJP.variable} font-sans min-h-screen flex flex-col`}
      >
        <Providers>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          <Toaster />
          <DevWarning />
        </Providers>
      </body>
    </html>
  );
}
