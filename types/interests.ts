export interface InterestCategory {
  category: string
  tags: string[]
}

export const INTEREST_TAGS: InterestCategory[] = [
  {
    category: "プログラミング言語",
    tags: [
      "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#",
      "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Dart", "R",
      "Haskell", "Scala", "Lua", "SQL", "Shell/Bash",
    ],
  },
  {
    category: "Web開発",
    tags: [
      "React", "Next.js", "Vue.js", "Nuxt", "Angular", "Svelte",
      "HTML/CSS", "Tailwind CSS", "Node.js", "Express", "Django",
      "Flask", "Rails", "Laravel", "Spring Boot", "FastAPI",
      "GraphQL", "REST API",
    ],
  },
  {
    category: "モバイル開発",
    tags: [
      "iOS開発", "Android開発", "Flutter", "React Native", "SwiftUI",
    ],
  },
  {
    category: "AI・データ",
    tags: [
      "機械学習", "深層学習", "自然言語処理", "コンピュータビジョン",
      "データサイエンス", "データ分析", "生成AI", "LLM",
      "PyTorch", "TensorFlow",
    ],
  },
  {
    category: "インフラ・DevOps",
    tags: [
      "AWS", "GCP", "Azure", "Docker", "Kubernetes",
      "Linux", "CI/CD", "Terraform", "ネットワーク",
    ],
  },
  {
    category: "その他の技術分野",
    tags: [
      "セキュリティ", "ブロックチェーン", "IoT", "組み込み",
      "ゲーム開発", "Unity", "Unreal Engine",
      "AR/VR", "ロボティクス", "量子コンピューティング",
      "コンパイラ", "OS開発", "競技プログラミング",
      "CTF", "OSS活動",
    ],
  },
  {
    category: "デザイン・クリエイティブ",
    tags: [
      "UI/UXデザイン", "Figma", "グラフィックデザイン",
      "3Dモデリング", "映像制作", "DTM/音楽制作",
    ],
  },
  {
    category: "ビジネス・その他",
    tags: [
      "プロダクトマネジメント", "スタートアップ", "マーケティング",
      "技術記事執筆", "個人開発", "チーム開発",
    ],
  },
]

/** Tag character allowlist: alphanumeric, Japanese, / . + # - and spaces */
const TAG_PATTERN = /^[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBFー/\\.+#\- ]+$/

export const MAX_TAGS = 15
export const MAX_TOP_INTERESTS = 5
export const TAG_MIN_LENGTH = 1
export const TAG_MAX_LENGTH = 20

export function isValidTag(tag: string): boolean {
  const trimmed = tag.trim()
  if (trimmed.length < TAG_MIN_LENGTH || trimmed.length > TAG_MAX_LENGTH) return false
  return TAG_PATTERN.test(trimmed)
}

/** All preset tags as a flat set for quick lookup */
export const ALL_PRESET_TAGS = new Set(
  INTEREST_TAGS.flatMap((c) => c.tags)
)
