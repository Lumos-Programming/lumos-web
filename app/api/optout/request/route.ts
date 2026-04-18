import { NextRequest, NextResponse } from "next/server";
import {
  verifyOptoutRequest,
  getOptoutFinalizeUrl,
  recordOptoutSurvey,
  OPTOUT_REASON_VALUES,
  type OptoutReason,
} from "@/lib/discord-optout";
import { getMember, isMemberOptedOut } from "@/lib/members";
import { isValidSnowflake } from "@/lib/auth";
import {
  sendDiscordDm,
  editDiscordDm,
  buildOptoutConfirmRequestMessage,
  buildOptoutConfirmRequestButtons,
} from "@/lib/discord-dm";

const REASON_SET = new Set<string>(OPTOUT_REASON_VALUES);
const REASON_DETAIL_MAX = 1000;

type RequestBody = {
  discordId?: unknown;
  sig?: unknown;
  survey?: {
    reason?: unknown;
    reasonDetail?: unknown;
  };
};

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discordId = typeof body.discordId === "string" ? body.discordId : "";
  const sig = typeof body.sig === "string" ? body.sig : "";

  if (!isValidSnowflake(discordId) || !sig) {
    return NextResponse.json(
      { error: "リンクが不正です。最初からやり直してください。" },
      { status: 400 },
    );
  }

  const verified = verifyOptoutRequest(discordId, sig);
  if (!verified.ok) {
    // 署名不一致はリンクが古い可能性 — UI 側で「DM を確認してください」を表示できるよう
    // 401 相当で帰す。再発行 DM はページ側の GET で送っているので API からは送らない。
    return NextResponse.json(
      {
        error:
          "リンクが無効です。最新のリンクを Discord DM から開いて再度お試しください。",
      },
      { status: 401 },
    );
  }

  // アンケート入力の検証
  const rawSurvey = body.survey ?? {};
  const reasonValue =
    typeof rawSurvey.reason === "string" ? rawSurvey.reason : "";
  if (!REASON_SET.has(reasonValue)) {
    return NextResponse.json(
      { error: "継続しない理由を選択してください" },
      { status: 400 },
    );
  }
  const reason = reasonValue as OptoutReason;

  let reasonDetail: string | undefined;
  if (typeof rawSurvey.reasonDetail === "string") {
    const trimmed = rawSurvey.reasonDetail.trim();
    if (trimmed.length > REASON_DETAIL_MAX) {
      return NextResponse.json(
        { error: `自由記述は${REASON_DETAIL_MAX}文字以内でお願いします` },
        { status: 400 },
      );
    }
    if (trimmed) reasonDetail = trimmed;
  }

  const member = await getMember(discordId);

  // 既に確定済みなら冪等に success を返す（UI 側で「受付済み」表示へ）
  if (isMemberOptedOut(member)) {
    return NextResponse.json({ success: true, alreadyRecorded: true });
  }

  // Step 1: アンケートを先に保存（DM 送信失敗時の再試行に備える）
  try {
    await recordOptoutSurvey(discordId, { reason, reasonDetail });
  } catch (e) {
    console.error("Failed to record opt-out survey:", e);
    return NextResponse.json(
      {
        error:
          "サーバーで保存に失敗しました。しばらくしてから再度お試しください。",
      },
      { status: 500 },
    );
  }

  // Step 2 の最終確認 DM を送信
  // 1. ボタン無しで送信 → messageId を取得
  // 2. PATCH で messageId を埋め込んだ finalizeUrl ボタンを後付けする
  // これにより確定後に同じ messageId でボタンを削除して誤クリックを防げる
  const displayName =
    member?.discordUsername ?? member?.nickname ?? "Discord ユーザー";
  let messageId: string;
  try {
    const sent = await sendDiscordDm(
      discordId,
      buildOptoutConfirmRequestMessage(displayName),
    );
    messageId = sent.messageId;
  } catch (e) {
    console.error("Failed to send opt-out confirm DM:", e);
    return NextResponse.json(
      {
        error:
          "Discordへの確認DM送信に失敗しました。DMを受信できる設定かご確認のうえ、再度お試しください。",
      },
      { status: 502 },
    );
  }

  // messageId 埋め込み済みのボタンを後付け。失敗したらボタン無しで届いてしまうので 502
  try {
    const finalizeUrl = getOptoutFinalizeUrl(discordId, messageId);
    await editDiscordDm(discordId, messageId, {
      components: buildOptoutConfirmRequestButtons(finalizeUrl),
    });
  } catch (e) {
    console.error("Failed to attach confirm button:", e);
    return NextResponse.json(
      {
        error:
          "Discordへの確認DM送信に失敗しました。DMを受信できる設定かご確認のうえ、再度お試しください。",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
