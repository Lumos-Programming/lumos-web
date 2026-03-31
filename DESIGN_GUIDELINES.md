# Lumos Small Talks - デザインガイドライン

このドキュメントは、Lumos Small Talks プロジェクトのデザインテイストを他のプロジェクトで再現するためのガイドラインです。

## 🎨 カラーパレット

### ライトモード (デフォルト)

| 要素 | HSL値 | 説明 |
|------|------|------|
| **Primary** | 262 83% 58% | 紫色 - Lumos のメインブランドカラー |
| **Primary Foreground** | 0 0% 100% | 白 - Primary 上のテキスト |
| **Secondary** | 220 14% 96% | ライトグレー - サブ背景 |
| **Secondary Foreground** | 240 10% 10% | ほぼ黒 - Secondary 上のテキスト |
| **Accent** | 262 80% 95% | 薄紫 - ハイライト・ホバー時 |
| **Accent Foreground** | 262 83% 58% | 紫（Primary と同じ） - Accent 上のテキスト |
| **Background** | 240 20% 98% | ほぼ白 - ページ背景 |
| **Foreground** | 240 10% 10% | ほぼ黒 - 標準テキスト |
| **Card** | 0 0% 100% | 白 - カード背景 |
| **Card Foreground** | 240 10% 10% | ほぼ黒 - カード内テキスト |
| **Border** | 240 6% 90% | 薄グレー - 枠線 |
| **Input** | 240 6% 90% | 薄グレー - 入力フィールド |
| **Destructive** | 0 84% 60% | 赤 - 削除・危険操作 |
| **Destructive Foreground** | 0 0% 100% | 白 - Destructive 上のテキスト |
| **Muted** | 220 14% 96% | ライトグレー - 無効化・薄い状態 |
| **Muted Foreground** | 240 4% 46% | グレー - Muted 上のテキスト |

### グラデーション

#### Primary グラデーション

```css
.bg-gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

| 属性 | 値 | 説明 |
|------|-----|------|
| **角度** | 135deg | 左上から右下へ |
| **開始色** | #667eea | rgb(102, 126, 234) - 青紫 |
| **終了色** | #764ba2 | rgb(118, 75, 162) - 紫 |
| **用途** | ヘッダー、メインアクション、ナビゲーション背景 |

#### Card グラデーション（薄い版）

```css
.bg-gradient-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}
```

| 属性 | 値 | 説明 |
|------|-----|------|
| **角度** | 135deg | 左上から右下へ |
| **開始色** | rgba(102, 126, 234, 0.05) | Primary グラデーション開始色の 5% 透明度版 |
| **終了色** | rgba(118, 75, 162, 0.05) | Primary グラデーション終了色の 5% 透明度版 |
| **用途** | カードヘッダー背景、サブアクション背景 |

#### オレンジ グラデーション（差し色）

```css
.bg-gradient-orange {
  background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
}
```

| 属性 | 値 | 説明 |
|------|-----|------|
| **角度** | 135deg | 左上から右下へ |
| **開始色** | #ea580c | rgb(234, 88, 12) - 濃いオレンジ（orange-600） |
| **終了色** | #f97316 | rgb(249, 115, 22) - オレンジ（orange-500） |
| **用途** | 時間情報、アクセント要素、アラート背景 |

### ダークモード

紫系の primary は調整され、背景は濃紺など、ダークモード対応が実装されています。
詳細は `app/globals.css` の `.dark` クラスを参照。

## 📐 タイポグラフィと サイズ

### Border Radius

- `lg`: 0.75rem (12px) - **デフォルトの角丸**
- `md`: calc(var(--radius) - 2px) = 10px - 若干小さい角丸
- `sm`: calc(var(--radius) - 4px) = 8px - より小さい角丸

**使い分け**：

- Card, 大型コンポーネント: `lg` (rounded-lg)
- Button, Badge: `md` (rounded-md)
- 小さい要素: `sm` (rounded-sm)

### Spacing/Padding

- Card 標準: `p-6` (1.5rem = 24px)
- CardHeader: `p-6`
- CardContent: `p-6 pt-0` (上部パディング調整)
- Button: `px-4 py-2` (default)
- Button (lg): `px-8 py-2`
- Button (sm): `px-3 py-1`

### Typography

- Heading (h1): `text-3xl md:text-4xl font-extrabold`
- Title (h3): `font-semibold leading-none tracking-tight`
- Body: Standard Tailwind text-sm
- 小見出し・Badge: `text-xs font-semibold`

## 🧩 UI コンポーネント設計

### Card コンポーネント

```tsx
<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
  </CardHeader>
  <CardContent>
    コンテンツ
  </CardContent>
</Card>
```

**特性**：

- `rounded-xl border bg-card text-card-foreground shadow`
- ホバー時: `shadow-2xl transition-all duration-300 hover:-translate-y-1` (浮き上がり効果)
- Border スタイル: `border-2 border-transparent hover:border-purple-200` (ホバーでホバー時に紫の枠線)

### Button バリエーション

1. **default** - Primary カラー

   ```tsx
   <Button>テキスト</Button>
   ```

   - 背景: Primary (紫)
   - ホバー: `bg-primary/90` (濃くなる)
   - 使用: メインアクション

2. **outline** - 枠線スタイル

   ```tsx
   <Button variant="outline">テキスト</Button>
   ```

   - 背景: Background（透明的）
   - ホバー: `bg-accent hover:text-accent-foreground` (薄紫背景)
   - 使用: セカンダリアクション、週ナビゲーション

3. **ghost** - テキストのみ

   ```tsx
   <Button variant="ghost">テキスト</Button>
   ```

   - ホバー: `bg-accent`
   - 使用: 軽いインタラクション

4. **destructive** - 削除

   ```tsx
   <Button variant="destructive">削除</Button>
   ```

   - 背景: Destructive (赤)
   - 使用: 削除・危険操作

### Badge コンポーネント

```tsx
<Badge>ユーザー名</Badge>
```

**バリエーション**：

- `default`: Primary 背景 + 白テキスト
- `outline`: 透明背景 + Border

### Avatar コンポーネント

```tsx
<Avatar src={imageUrl} alt="ユーザー名" className="h-14 w-14 ring-2 ring-purple-100" />
```

- 円形(`rounded-full`)
- Ring: `ring-2 ring-purple-100` - 薄紫の外枠

### Input/Textarea

```tsx
<Input placeholder="入力してください" />
<Textarea placeholder="複数行入力" />
```

- Border: `border-input`
- ホバー/フォーカス: `ring-1 ring-ring` (紫色のリング)

## 🎭 アニメーション

### グラデーション背景アニメーション

```css
@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 15s ease infinite;
}
```

- ヘッダーなど、グラデーション背景が流れるようにアニメーション
- 15 秒のサイクル

### フェードインアップ

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out;
}
```

- 初期表示時のアニメーション

### ホバー/トランジション効果

- Card: `hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`
  - 影が強くなる
  - 上に 4px 移動 (calc(1rem / 4) = translateY(-1))
  - 300ms で滑らかに変化

- Button: `transition-colors` (背景色の変化)

## 📐 レイアウト

### Container

- Max-width: `max-w-5xl` (64rem = 1024px)
- Padding: `px-4` (16px, 両側)
- `mx-auto` で中央寄せ

### Grid System

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* モバイル: 1列、デスクトップ: 2列 */}
</div>
```

## 🎯 主要コンポーネントのパターン

### ヘッダー

```tsx
<header className="bg-gradient-primary animate-gradient relative overflow-hidden">
  <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
  {/* グリッドパターンオーバーレイ */}
</header>
```

**特性**：

- 背景: Primary カラーのグラデーション + アニメーション
- オーバーレイ: 白い細いグリッドパターン（20px × 20px）
- テキスト: 白、中央寄せ
- ロゴ: 白い背景 + バックドロップブラー

### 発表カード (LTCard)

```tsx
<Card className="h-full flex flex-col hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-purple-200">
  <CardHeader className="flex flex-row items-start space-x-4 pb-3 bg-gradient-card">
    <Avatar src={...} />
    <div>
      <Badge>発表者名</Badge>
      <CardTitle>発表タイトル</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    {/* Markdown コンテンツ */}
  </CardContent>
  {isOwner && (
    <div className="p-4 pt-0 flex justify-end space-x-2 border-t bg-gray-50">
      <Button variant="outline">編集</Button>
      <Button variant="destructive">削除</Button>
    </div>
  )}
</Card>
```

**特性**：

- Header: グラデーション背景
- Avatar: リング付き
- タイトル・発表者情報: 左に整列
- 持ち主のみ編集/削除ボタン表示
- 下部: 作成日時を小さいテキストで

## 🌐 レスポンシブデザイン

- **モバイル**: 1 列レイアウト
- **デスクトップ (lg以上)**: 2 列レイアウト
- Padding: `px-4` で両サイズ対応
- ヘッダー: テキストサイズ変更 (text-3xl → text-4xl)

## ✅ 実装チェックリスト

他のプロジェクトで同じデザインテイストを適用する場合：

- [ ] `tailwind.config.ts` でカラー定義を上記のカラーパレットに合わせる
- [ ] `globals.css` でアニメーション、Prose スタイル、グレーディエント背景を定義
- [ ] UI コンポーネント (Card, Button, Badge, Avatar, Input, Textarea) を実装
- [ ] Border Radius: `0.75rem` をデフォルトに設定
- [ ] ホバー効果: Cards は shadow-2xl + -translate-y-1、Buttons は色変更
- [ ] グラデーション背景: Primary カラー + グリッドパターン
- [ ] レスポンシブ: モバイル 1 列、デスクトップ 2 列
- [ ] ダークモード: (オプション) `.dark` でカラー調整

## 📝 注記

- すべてのカラーは CSS 変数 (`--color-name`) で定義され、ライト/ダークモード両対応
- Tailwind CSS の `extend` で拡張されている
- React コンポーネントは `cn()` ユーティリティで className をマージ
- `class-variance-authority` の概念で Button などのバリエーション管理
