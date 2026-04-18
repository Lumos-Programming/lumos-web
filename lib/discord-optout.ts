/**
 * 退会 (opt-out) フロー用のトークン生成・検証ヘルパー
 * Discord DMのリンクボタンに埋め込む HMAC 署名付きURLと、Firestore保存ロジック
 *
 * 2段階確認:
 *   Step 1 (Web)     : /optout/{discordId}/{sig}                   — 無期限
 *   Step 2 (DM→Web)  : /optout/confirm/{discordId}/{exp}/{sig}     — 20分有効
 *
 * 設計方針:
 *   - discordId は URL path に平文で載せる。AUTH_SECRET ローテで鍵が変わっても
 *     リンクに記載されている宛先ユーザーは常に判別可能 (=無効時に再送可能)。
 *   - sig は HMAC-SHA256 で正当性のみを証明する。改竄検出。
 *   - Step 2 の exp も path 平文。sig には exp を含めて改竄を防ぐ。
 *   - kind は URL path (/optout vs /optout/confirm) で分離するので sig 材料にも
 *     ドメイン文字列として含める。
 *
 * 表示上のアクセス期日 (4月末目処) は UI 側に文言としてベタ書きし、
 * 本モジュールの Firestore データやトークンには保持しない。
 */

import crypto from "crypto";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

// Firestore docId キー (既存レコードとの互換維持)
const OPTOUT_KIND = "continuation-2026";
const SURVEY_COLLECTION = "survey_optout";

// HMAC ドメイン分離用ラベル
const REQUEST_LABEL = "optout-request-v1";
const CONFIRM_LABEL = "optout-confirm-v1";

// 最終確認 (confirm) トークンの有効期限 (秒)。
export const OPTOUT_CONFIRM_TTL_SECONDS = 20 * 60;

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return crypto
    .createHash("sha256")
    .update(`lumos-optout-hmac|${secret}`)
    .digest();
}

function sign(material: string): string {
  return crypto
    .createHmac("sha256", deriveKey())
    .update(material)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// --- Token decode result types ---

export type OptoutTokenError = "invalid" | "expired" | "missing_secret";

export type OptoutRequestDecodeResult =
  | { ok: true; discordId: string }
  | { ok: false; error: OptoutTokenError; discordId?: string };

export type OptoutConfirmDecodeResult =
  | { ok: true; discordId: string; exp: number; messageId: string }
  | { ok: false; error: OptoutTokenError; discordId?: string };

// --- Step 1 (request) ---

export function signOptoutRequest(discordId: string): string {
  return sign(`${REQUEST_LABEL}|${discordId}`);
}

/** `/optout/{discordId}/{sig}` を検証 */
export function verifyOptoutRequest(
  discordId: string,
  sig: string,
): OptoutRequestDecodeResult {
  if (!process.env.AUTH_SECRET) {
    return { ok: false, error: "missing_secret", discordId };
  }
  if (!discordId || !sig) {
    return { ok: false, error: "invalid", discordId };
  }
  const expected = signOptoutRequest(discordId);
  if (!timingSafeEqual(expected, sig)) {
    return { ok: false, error: "invalid", discordId };
  }
  return { ok: true, discordId };
}

// --- Step 2 (confirm) ---

export function signOptoutConfirm(
  discordId: string,
  exp: number,
  messageId: string,
): string {
  return sign(`${CONFIRM_LABEL}|${discordId}|${exp}|${messageId}`);
}

/** `/optout/confirm/{discordId}/{exp}/{messageId}/{sig}` を検証 */
export function verifyOptoutConfirm(
  discordId: string,
  expRaw: string,
  sig: string,
  messageId: string,
): OptoutConfirmDecodeResult {
  if (!process.env.AUTH_SECRET) {
    return { ok: false, error: "missing_secret", discordId };
  }
  if (!discordId || !expRaw || !sig || !messageId) {
    return { ok: false, error: "invalid", discordId };
  }
  if (!/^\d{1,13}$/.test(expRaw)) {
    return { ok: false, error: "invalid", discordId };
  }
  if (!/^\d{1,25}$/.test(messageId)) {
    return { ok: false, error: "invalid", discordId };
  }
  const exp = Number(expRaw);
  const expected = signOptoutConfirm(discordId, exp, messageId);
  if (!timingSafeEqual(expected, sig)) {
    return { ok: false, error: "invalid", discordId };
  }
  if (exp * 1000 < Date.now()) {
    return { ok: false, error: "expired", discordId };
  }
  return { ok: true, discordId, exp, messageId };
}

// --- URL helpers ---

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

/** Step 1 のランディング URL */
export function getOptoutRequestUrl(discordId: string): string {
  return `${getBaseUrl()}/optout/${discordId}/${signOptoutRequest(discordId)}`;
}

/**
 * Step 2 のランディング URL (exp 20 分後)。
 * messageId は元の Confirm DM のメッセージIDで、確定後にそのメッセージを編集して
 * 誤クリックを防ぐのに使う。URL には平文で含むが HMAC 署名の material にも入れて改竄検出する。
 */
export function getOptoutFinalizeUrl(
  discordId: string,
  messageId: string,
): string {
  const exp = Math.floor(Date.now() / 1000) + OPTOUT_CONFIRM_TTL_SECONDS;
  const sig = signOptoutConfirm(discordId, exp, messageId);
  return `${getBaseUrl()}/optout/confirm/${discordId}/${exp}/${messageId}/${sig}`;
}

// --- Firestore: optout_submissions ---

export interface OptoutSubmission {
  discordId: string;
  kind: string;
  confirmedAt: FirebaseFirestore.Timestamp;
  userAgent?: string;
  ipHash?: string;
}

export async function recordOptoutSubmission(
  discordId: string,
  meta: { userAgent?: string; ipHash?: string },
): Promise<void> {
  const db = getDb();
  const docId = `${discordId}_${OPTOUT_KIND}`;
  await db
    .collection("optout_submissions")
    .doc(docId)
    .set(
      {
        discordId,
        kind: OPTOUT_KIND,
        confirmedAt: FieldValue.serverTimestamp(),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
        ...(meta.ipHash ? { ipHash: meta.ipHash } : {}),
      },
      { merge: false },
    );
}

export async function getOptoutSubmission(
  discordId: string,
): Promise<OptoutSubmission | null> {
  const db = getDb();
  const docId = `${discordId}_${OPTOUT_KIND}`;
  const snap = await db.collection("optout_submissions").doc(docId).get();
  if (!snap.exists) return null;
  return snap.data() as OptoutSubmission;
}

/** 再加入時: opt-out 確定レコードを削除 (冪等) */
export async function deleteOptoutSubmission(discordId: string): Promise<void> {
  const db = getDb();
  const docId = `${discordId}_${OPTOUT_KIND}`;
  await db.collection("optout_submissions").doc(docId).delete();
}

/** opt-out 確定済みユーザーの discordId 一覧。登録案内 DM 除外フィルタに使う */
export async function getOptoutSubmissionIds(): Promise<Set<string>> {
  const db = getDb();
  const snap = await db
    .collection("optout_submissions")
    .where("kind", "==", OPTOUT_KIND)
    .get();
  return new Set(
    snap.docs
      .map((doc) => (doc.data() as Partial<OptoutSubmission>).discordId)
      .filter((id): id is string => typeof id === "string"),
  );
}

// --- Firestore: surveys (opt-out アンケート) ---

export const OPTOUT_REASON_VALUES = [
  "busy",
  "interest_changed",
  "atmosphere",
  "content",
  "graduated",
  "other",
] as const;
export type OptoutReason = (typeof OPTOUT_REASON_VALUES)[number];

export interface OptoutSurveyInput {
  reason: OptoutReason;
  reasonDetail?: string;
}

/** Step 1 送信時: opt-out 専用コレクション `survey_optout` に保存 */
export async function recordOptoutSurvey(
  discordId: string,
  input: OptoutSurveyInput,
): Promise<void> {
  const db = getDb();
  await db
    .collection(SURVEY_COLLECTION)
    .doc(discordId)
    .set(
      {
        discordId,
        reason: input.reason,
        ...(input.reasonDetail ? { reasonDetail: input.reasonDetail } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/** Step 2 完了時: 対応する survey に `confirmedAt` を追記 (存在しない場合は no-op) */
export async function markOptoutSurveyConfirmed(
  discordId: string,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(SURVEY_COLLECTION).doc(discordId);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.set({ confirmedAt: FieldValue.serverTimestamp() }, { merge: true });
}
