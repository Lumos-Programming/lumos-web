/**
 * 登録済みブログのサムネイルを補完する一度きりのスクリプト（#309）。
 * 既定は確認のみ（dry run）。--apply を付けたときだけ Firestore に書き込む。
 *
 * 使い方（接続先は lib/firebase.ts と同じく環境変数で決まる）:
 *   npx -y tsx --env-file=.env.local scripts/backfill-blog-thumbnails.ts
 *   npx -y tsx --env-file=.env.local scripts/backfill-blog-thumbnails.ts --apply
 */
import {
  applyThumbnailBackfill,
  planThumbnailBackfill,
} from "@/lib/blog-thumbnail-backfill";

async function main() {
  const apply = process.argv.includes("--apply");
  const items = await planThumbnailBackfill();

  for (const item of items) {
    const { action } = item;
    if (action.kind === "keep") continue;
    const label =
      action.kind === "clear"
        ? "削除（画像が表示できず、OGP からも取得できない）"
        : `${action.reason === "missing" ? "追加" : "差し替え"}: ${action.thumbnailUrl}`;
    console.log(`${item.id} ${item.url}\n  ${label}`);
  }

  const changes = items.filter((i) => i.action.kind !== "keep").length;
  console.log(`\n記事 ${items.length} 件中、変更対象 ${changes} 件`);

  if (!apply) {
    console.log(
      "確認のみです。反映するには --apply を付けて実行してください。",
    );
    return;
  }
  const updated = await applyThumbnailBackfill(items);
  console.log(`${updated} 件を更新しました。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
