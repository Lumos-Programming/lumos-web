import { auth, signIn, signOut, isValidSnowflake } from "@/lib/auth";
import { getWeekData, addTalk, updateTalk, deleteTalk } from "@/lib/firebase";
import { getNextEventWeekId } from "@/lib/mini-lt/utils";
import {
  createWeekEvent,
  syncWeekEventDescription,
} from "@/lib/mini-lt/actions/discord-events";
import { WeekNavigator } from "@/components/mini-lt/WeekNavigator";
import { ManageTalks } from "@/components/mini-lt/ManageTalks";
import { Header } from "@/components/mini-lt/Header";
import { Button } from "@/components/mini-lt/ui";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const weekId = params.week || getNextEventWeekId();

  // Force logout if session has invalid user ID (old UUID format instead of Snowflake)
  if (session && !isValidSnowflake(session.user?.id)) {
    return (
      <main className="bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4 min-h-[80vh]">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-bold mb-3">
              セッションの更新が必要です
            </h1>
            <p className="text-muted-foreground">
              古いセッション形式を検出しました。
              <br />
              再度ログインしてください。
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <Button
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold"
            >
              ログアウトして再ログイン
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-purple-600 transition-colors"
            >
              ← 公開ページへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4 min-h-[80vh]">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold mb-3">発表登録</h1>
            <p className="text-muted-foreground">
              発表を登録・管理するには
              <br />
              ログインが必要です
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("discord");
            }}
          >
            <Button
              size="lg"
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-6 text-lg font-semibold"
            >
              <span className="mr-2">💬</span>
              Discordでログイン
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-purple-600 transition-colors"
            >
              ← 公開ページへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const data = await getWeekData(weekId);
  const myTalks = data.talks.filter((t) => t.presenterUid === session.user?.id);

  const handleAction = async (formData: {
    title: string;
    description: string;
    duration: number;
    id?: string;
  }) => {
    "use server";
    const userId = session.user?.id as string;
    const userName = session.user?.name as string;
    const userAvatar = session.user?.image as string;

    if (formData.id) {
      // 編集の場合はそのまま更新
      await updateTalk(
        weekId,
        formData.id,
        {
          title: formData.title,
          description: formData.description,
          duration: formData.duration,
        },
        userId,
      );
    } else {
      // 新規登録の場合、既に発表があるかチェック
      const currentData = await getWeekData(weekId);
      const existingTalks = currentData.talks.filter(
        (t) => t.presenterUid === userId,
      );

      if (existingTalks.length >= 1) {
        throw new Error(
          "この週には既に発表を登録済みです。週に1件まで登録できます。",
        );
      }

      await addTalk(
        weekId,
        {
          title: formData.title,
          description: formData.description,
          duration: formData.duration,
          presenterName: userName,
          presenterAvatar: userAvatar,
        },
        userId,
      );
    }

    // Auto-sync Discord event if it exists, or create it if this is the first talk
    const updatedData = await getWeekData(weekId);
    if (updatedData.discordEventId) {
      // Event exists, sync the description
      try {
        await syncWeekEventDescription(weekId, updatedData.discordEventId);
      } catch (error) {
        console.error("Failed to sync Discord event:", error);
        // Don't fail the entire operation if Discord sync fails
      }
    } else if (updatedData.talks.length > 0) {
      // No event yet, but we have talks - create the event automatically
      try {
        await createWeekEvent(weekId);
      } catch (error) {
        console.error("Failed to create Discord event:", error);
        // Don't fail the entire operation if Discord event creation fails
      }
    }

    revalidatePath("/submit");
    revalidatePath("/");
  };

  const handleDelete = async (talkId: string) => {
    "use server";
    const userId = session.user?.id as string;
    await deleteTalk(weekId, talkId, userId);

    // Auto-sync Discord event if it still exists after deletion
    const updatedData = await getWeekData(weekId);
    if (updatedData.discordEventId) {
      try {
        await syncWeekEventDescription(weekId, updatedData.discordEventId);
      } catch (error) {
        console.error("Failed to sync Discord event:", error);
        // Don't fail the entire operation if Discord sync fails
      }
    }

    revalidatePath("/submit");
    revalidatePath("/");
  };

  return (
    <main className="min-h-screen">
      <Header />

      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-black bg-clip-text">
                  📝 発表エントリーページ
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  あなたの発表を登録・編集できます
                </p>
              </div>
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-gradient-primary text-white px-3 md:px-4 py-2 rounded-full text-sm md:text-base">
                  {session.user?.image && (
                    <Image
                      width={100}
                      height={100}
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full"
                    />
                  )}
                  <span className="font-medium truncate max-w-[120px] md:max-w-none">
                    {session.user?.name}
                  </span>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await signOut();
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-red-50 hover:border-red-300 text-sm"
                  >
                    🚪 ログアウト
                  </Button>
                </form>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <WeekNavigator currentWeek={weekId} baseUrl="/mini-lt/submit" />
          </div>

          <ManageTalks
            weekId={weekId}
            myTalks={JSON.parse(JSON.stringify(myTalks))}
            onAction={handleAction}
            onDelete={handleDelete}
          />

          <div className="mt-12 text-center pb-8">
            <Link href="/">
              <Button
                variant="outline"
                className="hover:bg-purple-50 hover:border-purple-300"
              >
                ← 公開ページへ戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
