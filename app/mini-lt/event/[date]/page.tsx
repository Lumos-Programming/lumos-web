import { getWeekData } from "@/lib/firebase";
import { getWeekId, getNextEventDate } from "@/lib/mini-lt/utils";
import Script from "next/script";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ date: string }>;
};

export default async function EventRedirectPage({ params }: PageProps) {
  const { date } = await params;

  // Parse date string (format: YYYY-MM-DD)
  let targetDate: Date;
  try {
    targetDate = new Date(date);
    // Check if date is valid
    if (isNaN(targetDate.getTime())) {
      // Invalid date: use today
      targetDate = new Date();
    }
  } catch {
    // Parse error: use today
    targetDate = new Date();
  }

  // Find the next event date from the target date
  const eventDate = getNextEventDate(targetDate);

  // Get week ID from the calculated event date
  const weekId = getWeekId(eventDate);

  // Fetch week data to get Discord event URL
  const weekData = await getWeekData(weekId);

  // If no Discord event exists, redirect to home page for that week immediately
  if (!weekData.discordEventUrl) {
    redirect(`/mini-lt?week=${weekId}`);
  }

  const redirectUrl = weekData.discordEventUrl;

  // Extract Discord event ID for deep link
  const discordDeepLink = weekData.discordEventUrl.replace(
    "https://discord.com/events/",
    "discord:///events/",
  );

  return (
    <>
      <Script id="deep-link-redirect" strategy="afterInteractive">
        {`
          (function() {
            var deepLink = "${discordDeepLink}";
            if (deepLink) {
              window.location.href = deepLink;
            }
          })();
        `}
      </Script>
      <main className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
          <div className="text-6xl mb-6 animate-bounce">💬</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Discord イベントを開く
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Discordアプリが自動的に開きます。
            <br />
            開かない場合は下のボタンをクリックしてください。
          </p>
          <a
            href={redirectUrl}
            className="inline-block bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            Discord イベントを開く
          </a>
          <p className="text-gray-400 text-sm mt-6 leading-relaxed">
            Discordアプリがインストールされている場合は
            <br />
            アプリで開くことをおすすめします。
          </p>
        </div>
      </main>
    </>
  );
}
