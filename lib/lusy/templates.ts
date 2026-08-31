/**
 * 通知文面のテンプレート。
 *
 * LLM による文章生成は行わない。カテゴリごとの配列からランダムに 1 つ選ぶ。
 * 方針は issue #273 §11 を参照:
 *   短い / 雑 / テンションが高い / 顔文字 / 丁寧語を使わない / 人を責めない /
 *   世界観や実況を作り込まない。「面白くしようとして文章を足すくらいなら、削る」。
 *
 * テンプレートは 2 種類に分かれる:
 *   HEADER_TEMPLATES … 変数なし。複数 Item をまとめた見出しに使う。
 *   ITEM_TEMPLATES   … `{{number}}` を含む。Item が 1 件のときだけ使える。
 * DM は複数 Item を 1 メッセージにまとめるため、この区別が無いと
 * 「タスク #{{number}}「俺のこと、覚えてる？」」を 5 件の見出しに使ってしまう。
 *
 * 顔文字について: Discord は `\` を escape 文字として扱うため、
 * `＼＼\٩( 'ω' )و //／／` のような半角バックスラッシュ入りの表記は表示が崩れる。
 * ここでは全角の `＼` `／` に寄せた安全な表記を使う (issue #273 §12.2)。
 */

export type TemplateCategory =
  | "issue_reminder"
  | "draft_pr"
  | "review_request"
  | "team_review_request"
  | "unassigned_review"
  | "changes_requested"
  | "issue_completed"
  | "pr_merged"
  | "digest_header";

export const HEADER_TEMPLATES: Record<TemplateCategory, string[]> = {
  issue_reminder: [
    "(☝ ՞ਊ ՞)☝ タスクまだあるぜ〜〜〜！！！",
    "ᕕ( ᐛ )ᕗ タスクが進むぞ進むぞ〜〜〜",
    "└(՞ةڼ◔)」残タスク！！！！",
    "タスク！！！！！！！！",
    "おーーーーい！！！！タスク！！！！",
    "＼( 'ω')／ まだあるぞ〜〜〜",
    "残ってるぞ〜〜〜〜！！！",
    "TASK STILL ALIVE",
    "三└(┐卍^o^)卍 タスクだタスク",
    "٩( ᐛ )و やることあるぞ！！！！",
    "(☝ ՞ਊ ՞)☝ 積んでるぞ〜〜〜！！！",
    "TODO！！！！TODO！！！！",
  ],
  draft_pr: [
    "(☝ ՞ਊ ՞)☝ DRAFTまだいるぜ〜〜〜！！！",
    "DRAFT！！！！！！！！",
    "ᕕ( ᐛ )ᕗ DRAFT進めるぞ〜〜〜〜",
    "＼＼٩( 'ω' )و ／／ DRAFT STILL ALIVE",
    "下書きおるぞ！！！！",
    "└(՞ةڼ◔)」DRAFT！！！！",
    "ᕕ( ᐛ )ᕗ もうちょいだ〜〜〜",
    "DRAFTおるぞ〜〜〜〜",
    "三└(┐卍^o^)卍 DRAFTだDRAFT",
    "＼( 'ω')／ 書きかけあるぞ",
    "WIP！！！！！！",
    "(☝ ՞ਊ ՞)☝ 途中のやつ〜〜〜！！！",
  ],
  review_request: [
    "(☝ ՞ਊ ՞)☝ レビューが君を待ってるぜ〜〜〜！！！",
    "└(՞ةڼ◔)」レビュー！！！！レビュー！！！！",
    "レビューだあああああああ",
    "PRきてるぞ！！！！！！！！",
    "＼＼٩( 'ω' )و ／／ REVIEW TIME",
    "٩( ᐛ )و REVIEW!!! REVIEW!!! REVIEW!!!",
    "レビューやるぞ！！！！！！！！",
    "あとレビューだけ！！！！！！",
    "三└(┐卍^o^)卍 レビューいくぞ",
    "ᕕ( ᐛ )ᕗ レビューレビュー〜〜〜",
    "REVIEW！！！！！！！！",
    "＼( 'ω')／ 見てくれ〜〜〜",
    "PR来た！！！！！！！！",
  ],
  team_review_request: [
    "(☝ ՞ਊ ՞)☝ チーム宛のレビューだぜ〜〜〜！！！",
    "└(՞ةڼ◔)」チームにレビュー！！！！",
    "チーム宛！！！！レビュー！！！！",
    "＼＼٩( 'ω' )و ／／ TEAM REVIEW",
    "誰か手空いてたら頼む〜〜〜！！！",
    "ᕕ( ᐛ )ᕗ チームにきてるぞ〜〜〜",
    "٩( ᐛ )و TEAM REVIEW!!!",
    "チームレビューだあああ",
    "三└(┐卍^o^)卍 チーム宛だぞ",
    "＼( 'ω')／ チームに来てるぞ〜",
  ],
  unassigned_review: [
    "PR出てるぞ！！！！ reviewerおらんぞ！！！！",
    "(☝ ՞ਊ ՞)☝ READYだけど誰に投げるんだぜ〜〜〜！！！",
    "REVIEWER！！！！おらん！！！！",
    "まだ作業中ならDRAFTだ！！！！",
    "誰も呼ばれてないぞ〜〜〜〜",
    "└(՞ةڼ◔)」reviewer！！！！reviewer！！！！",
    "ᕕ( ᐛ )ᕗ 投げるか戻すかだ〜〜〜",
    "NO REVIEWER！！！！",
    "＼( 'ω')／ 誰か指名しよう〜",
    "三└(┐卍^o^)卍 reviewerだreviewer",
    "READYだけど誰も見てないぞ！！！",
  ],
  changes_requested: [
    "(☝ ՞ਊ ՞)☝ CHANGESきてるぜ〜〜〜！！！",
    "修正！！！！！！！！",
    "ᕕ( ᐛ )ᕗ 直すぞ直すぞ〜〜〜",
    "CHANGES REQUESTED！！！！",
    "コメントついてるぞ〜〜〜〜",
    "└(՞ةڼ◔)」修正！！！！修正！！！！",
    "＼( 'ω')／ 直すやつあるぞ",
    "٩( ᐛ )و FIX IT!!!",
    "三└(┐卍^o^)卍 直しだ直し",
    "returnedだ！！！！！！",
  ],
  issue_completed: [
    "(☝ ՞ਊ ՞)☝ DONEだぜ〜〜〜〜！！！",
    "やったぜ！！！！！！！！",
    "ᕕ( ᐛ )ᕗ 終わったぞ〜〜〜〜",
    "＼＼٩( 'ω' )و ／／ DONE!!!!!",
    "DONE！！！！DONE！！！！",
    "٩( ᐛ )و いえーーーーい",
    "終わり！！！！！！！！",
    "三└(┐卍^o^)卍 消化した",
    "＼( 'ω')／ 片付いたぞ〜〜〜",
    "CLOSED！！！！！！！！",
    "減ったぞ〜〜〜〜！！！",
  ],
  pr_merged: [
    "＼＼٩( 'ω' )و ／／ MERGED!!!!!",
    "MERGEだあああああああ",
    "(☝ ՞ਊ ՞)☝ マージされたぜ〜〜〜！！！",
    "ᕕ( ᐛ )ᕗ マージマージマージ〜〜〜",
    "MERGE！！！！！！！！",
    "入ったぞ〜〜〜〜！！！",
    "٩( ᐛ )و SHIPPED!!!",
    "三└(┐卍^o^)卍 マージだマージ",
    "＼( 'ω')／ 本線に入ったぞ",
    "やったーーーーー！！！！",
    "MERGED！！！！！！！！",
  ],
  digest_header: [
    "(☝ ՞ਊ ՞)☝ LUSY開発タイムだぜ〜〜〜！！！！",
    "└(՞ةڼ◔)」GITHUB！！！！GITHUB！！！！",
    "＼＼٩( 'ω' )و ／／ LUSY DEV TIME",
    "ᕕ( ᐛ )ᕗ 今のGitHubこんな感じ〜〜〜",
    "三└(┐卍^o^)卍 開発の時間だ",
    "GITHUBだぞ！！！！！！！！",
    "٩( ᐛ )و LUSY STATUS!!!",
    "＼( 'ω')／ 今週のGitHub〜〜〜",
    "(☝ ՞ਊ ՞)☝ たまってるぞ〜〜〜！！！",
    "定期GitHubだあああああ",
  ],
};

/**
 * Item が 1 件のときだけ使える、`{{number}}` を含むテンプレート。
 * 擬人化は「雑な一言」に留める (issue #273 §11.4)。
 */
export const ITEM_TEMPLATES: Partial<Record<TemplateCategory, string[]>> = {
  issue_reminder: [
    "タスク #{{number}}「俺のこと、覚えてる？」",
    "Issue #{{number}}「まだいるぞ」",
    "おーーーーい！！！！ #{{number}}！！！！",
    "Issue #{{number}}「おい」",
    "#{{number}}「まだ残ってるが？」",
    "タスク #{{number}}「そろそろどう？」",
  ],
  draft_pr: [
    "PR #{{number}}「作業中やで」",
    "PR #{{number}}「まだ書いてる」",
    "DRAFT #{{number}}「おるぞ」",
    "PR #{{number}}「もうちょい」",
  ],
  review_request: [
    "PR #{{number}}「レビュー」",
    "PR #{{number}}「おい」",
    "PR #{{number}}「いるぞ」",
    "PR #{{number}}「俺やで」",
    "PR #{{number}}「見て」",
  ],
  unassigned_review: [
    "PR #{{number}}「誰か呼ぶ？」",
    "PR #{{number}}「誰も見てないが？」",
    "PR #{{number}}「reviewerは？」",
  ],
  changes_requested: [
    "PR #{{number}}「修正あるぞ」",
    "PR #{{number}}「まだ言われてる」",
    "PR #{{number}}「戻ってきたぞ」",
  ],
  issue_completed: [
    "Issue #{{number}} DONE！！！！",
    "#{{number}} 終わったーーー！！！",
  ],
  pr_merged: [
    "PR #{{number}} MERGED！！！！",
    "#{{number}} 入ったぞーーー！！！",
  ],
};

/** テストで文面を固定できるよう、乱数源を注入可能にする。 */
export type Rng = () => number;

export interface PickedTemplate {
  text: string;
  index: number;
}

function pickIndex(length: number, rng: Rng, avoidIndex?: number): number {
  if (length <= 0) throw new Error("template list is empty");
  if (length === 1) return 0;

  const index = Math.min(Math.floor(rng() * length), length - 1);
  if (avoidIndex === undefined || index !== avoidIndex) return index;
  // 直前と同じなら 1 つずらす。連続で同じ文面が出るのを避けるだけなので分布は気にしない。
  return (index + 1) % length;
}

/**
 * カテゴリの文面を 1 つ選ぶ。
 *
 * `itemNumber` を渡すと `{{number}}` 入りのテンプレートも候補に含める
 * (= 対象 Item が 1 件のとき)。複数件の見出しでは渡さないこと。
 */
export function pickTemplate(
  category: TemplateCategory,
  options: {
    rng?: Rng;
    avoidIndex?: number;
    itemNumber?: number;
  } = {},
): PickedTemplate {
  const { rng = Math.random, avoidIndex, itemNumber } = options;

  const headers = HEADER_TEMPLATES[category];
  const items =
    itemNumber !== undefined ? (ITEM_TEMPLATES[category] ?? []) : [];
  const pool = [...headers, ...items];

  const index = pickIndex(pool.length, rng, avoidIndex);
  const raw = pool[index];
  const text =
    itemNumber !== undefined
      ? raw.replaceAll("{{number}}", String(itemNumber))
      : raw;

  return { text, index };
}

/** テンプレートに未解決の変数が残っていないか (テスト用)。 */
export function hasUnresolvedPlaceholder(text: string): boolean {
  return /\{\{\w+\}\}/.test(text);
}
