/**
 * 退会 (opt-out) フロー用のトークン生成・検証ヘルパー
 * Discord DMのリンクボタンに埋め込む暗号化トークンと、Firestore保存ロジック
 *
 * 2段階確認:
 *   Step 1 (Web)     : request token で /optout/[token] に誘導
 *   Step 2 (DM→Web)  : confirm token (短命・20分) で /optout/confirm/[token] を確定
 *
 * 表示上のアクセス期日 (4月末目処) は UI 側に文言としてベタ書きし、
 * 本モジュールの Firestore データやトークンには保持しない。
 */

import crypto from "crypto";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

// opt-out レコードの種別 (Firestore docId / トークン kind 共通)
const OPTOUT_KIND = "continuation-2026";
const CONFIRM_KIND = `${OPTOUT_KIND}-confirm`;
const SURVEY_COLLECTION = "survey_optout";

// 最終確認 (confirm) トークンの有効期限 (秒)。
// request token (Step 1) 側は期限を持たせず、常に有効として扱う。
export const OPTOUT_CONFIRM_TTL_SECONDS = 20 * 60;

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  // AUTH_SECRETから用途別の派生鍵を生成（HKDF的にsha256でドメイン分離）
  return crypto
    .createHash("sha256")
    .update(`lumos-optout-v1|${secret}`)
    .digest();
}

// --- Token types ---

export type OptoutKind = typeof OPTOUT_KIND | typeof CONFIRM_KIND;

export interface OptoutTokenPayload {
  discordId: string;
  kind: OptoutKind;
  /** Unix seconds — トークンの有効期限。request token では省略 (無期限) */
  exp?: number;
}

export type OptoutTokenError =
  | "invalid"
  | "expired"
  | "wrong_kind"
  | "missing_secret";

export interface OptoutTokenDecodeResult {
  ok: boolean;
  payload?: OptoutTokenPayload;
  error?: OptoutTokenError;
}

// --- Token encode / decode ---

function encodeToken(
  discordId: string,
  kind: OptoutKind,
  exp?: number,
): string {
  const payload: OptoutTokenPayload = {
    discordId,
    kind,
    ...(typeof exp === "number" ? { exp } : {}),
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, deriveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function decodeToken(
  token: string,
  expectedKind: OptoutKind,
): OptoutTokenDecodeResult {
  if (!process.env.AUTH_SECRET) {
    return { ok: false, error: "missing_secret" };
  }
  if (!token) return { ok: false, error: "invalid" };

  let raw: Buffer;
  try {
    raw = Buffer.from(token, "base64url");
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (raw.length < IV_LEN + TAG_LEN + 1) {
    return { ok: false, error: "invalid" };
  }

  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);

  let plaintext: Buffer;
  try {
    const decipher = crypto.createDecipheriv(ALGO, deriveKey(), iv);
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return { ok: false, error: "invalid" };
  }

  let payload: Partial<OptoutTokenPayload>;
  try {
    payload = JSON.parse(
      plaintext.toString("utf8"),
    ) as Partial<OptoutTokenPayload>;
  } catch {
    return { ok: false, error: "invalid" };
  }

  if (
    !payload ||
    typeof payload.discordId !== "string" ||
    typeof payload.kind !== "string"
  ) {
    return { ok: false, error: "invalid" };
  }

  if (payload.kind !== expectedKind) {
    return { ok: false, error: "wrong_kind" };
  }

  // exp が含まれる場合のみ期限チェック (confirm token 用)。
  // request token は exp を含めず、常に有効として扱う。
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    return { ok: false, error: "expired" };
  }

  const validated: OptoutTokenPayload = {
    discordId: payload.discordId,
    kind: payload.kind,
    ...(typeof payload.exp === "number" ? { exp: payload.exp } : {}),
  };
  return { ok: true, payload: validated };
}

/** Step 1 用: /optout/[token] に埋め込むトークン (有効期限なし) */
export function encodeOptoutRequestToken(discordId: string): string {
  return encodeToken(discordId, OPTOUT_KIND);
}

/** Step 1 用トークンを復号・検証 */
export function decodeOptoutRequestToken(
  token: string,
): OptoutTokenDecodeResult {
  return decodeToken(token, OPTOUT_KIND);
}

/** Step 2 用: /optout/confirm/[token] に埋め込む有効期限付きトークン (20 分) */
export function encodeOptoutConfirmToken(discordId: string): string {
  const exp = Math.floor(Date.now() / 1000) + OPTOUT_CONFIRM_TTL_SECONDS;
  return encodeToken(discordId, CONFIRM_KIND, exp);
}

/** Step 2 用トークンを復号・検証 */
export function decodeOptoutConfirmToken(
  token: string,
): OptoutTokenDecodeResult {
  return decodeToken(token, CONFIRM_KIND);
}

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

/** Step 1 のランディング URL (Discord DM の「継続しない / 退会する」ボタン) */
export function getOptoutRequestUrl(discordId: string): string {
  return `${getBaseUrl()}/optout/${encodeOptoutRequestToken(discordId)}`;
}

/** Step 2 のランディング URL (確認 DM の「退会処理を完了させる」ボタン) */
export function getOptoutFinalizeUrl(discordId: string): string {
  return `${getBaseUrl()}/optout/confirm/${encodeOptoutConfirmToken(discordId)}`;
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
