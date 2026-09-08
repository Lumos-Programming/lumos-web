/**
 * app/news/news-data.ts のお知らせを Firestore の news コレクションへ移す。
 *
 * 既存の URL (/news/9 など) を保つため、ドキュメント ID には元の id をそのまま使う。
 * 何度流しても同じ結果になる (すでにある ID は既定でスキップする)。
 *
 * 使い方:
 *   # ローカル (エミュレータ)
 *   just emulator
 *   pnpm dlx tsx scripts/migrate-news.ts
 *
 *   # stg / prod (Lumos の Google アカウントで ADC を通してから)
 *   gcloud auth application-default login
 *   FIRESTORE_EMULATOR_HOST= \
 *   FIREBASE_PROJECT_ID=lumos-infra FIRESTORE_DATABASE_ID=staging \
 *   pnpm dlx tsx scripts/migrate-news.ts
 *
 * オプション:
 *   --dry-run   書き込まずに、何が入るかだけ出す
 *   --force     すでにある ID も上書きする
 */
import { getDb } from "@/lib/firebase";
import { LEGACY_NEWS_ARTICLES } from "@/lib/news-legacy";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

async function main() {
  const db = getDb();
  const target = process.env.FIRESTORE_EMULATOR_HOST
    ? `エミュレータ (${process.env.FIRESTORE_EMULATOR_HOST})`
    : `${process.env.FIREBASE_PROJECT_ID} / ${process.env.FIRESTORE_DATABASE_ID ?? "(default)"}`;
  console.log(`移行先: ${target}${dryRun ? " [dry-run]" : ""}`);

  let created = 0;
  let skipped = 0;

  for (const article of LEGACY_NEWS_ARTICLES) {
    const ref = db.collection("news").doc(article.id);
    const exists = (await ref.get()).exists;

    if (exists && !force) {
      console.log(`  skip   ${article.id}  ${article.title} (既にある)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  would ${exists ? "overwrite" : "create"} ${article.id}  ${article.title}`,
      );
      created++;
      continue;
    }

    await ref.set({
      date: article.date,
      title: article.title,
      summary: article.summary,
      body: article.body,
      image: article.image,
      category: article.category,
      status: "published",
      // 一覧の並びを保つため、当時の日付をそのまま入れる
      publishedAt: article.publishedAt
        ? new Date(article.publishedAt)
        : new Date(),
      // 旧データに執筆者の記録は無い
      authorId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(
      `  ${exists ? "update" : "create"} ${article.id}  ${article.title}`,
    );
    created++;
  }

  console.log(
    `\n完了: ${created} 件${dryRun ? " (予定)" : ""}, スキップ ${skipped} 件`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
