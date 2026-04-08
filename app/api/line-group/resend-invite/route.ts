import { NextResponse } from "next/server";

export async function POST() {
  // 招待リンク再送はpush APIのメッセージ枠を消費するため無効化。
  // ユーザーはBot友だち追加 or DMで招待を受け取れる。
  return NextResponse.json(
    {
      error:
        "招待リンクの再送信は無効化されました。LINEの公式アカウントを友だち追加するか、Botにメッセージを送信してください。",
    },
    { status: 410 },
  );
}
