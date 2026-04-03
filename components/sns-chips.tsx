import Image from "next/image"

export interface SnsEntry {
  platform: "github" | "x" | "discord" | "linkedin" | "line"
  username: string
  url?: string
  avatarUrl?: string
}

// --- SVG Logos ---

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

function LineLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export const SNS_BRAND: Record<SnsEntry["platform"], { bg: string; text: string; prefixAt: boolean; Logo: (props: { className?: string }) => React.ReactNode }> = {
  discord:  { bg: "bg-[#5865F2]",                 text: "text-white", prefixAt: false, Logo: DiscordLogo },
  line:     { bg: "bg-[#06C755]",                 text: "text-white", prefixAt: false, Logo: LineLogo },
  github:   { bg: "bg-[#24292f] dark:bg-[#333]", text: "text-white", prefixAt: true,  Logo: GitHubLogo },
  x:        { bg: "bg-black dark:bg-[#1a1a1a]",  text: "text-white", prefixAt: true,  Logo: XLogo },
  linkedin: { bg: "bg-[#0A66C2]",                 text: "text-white", prefixAt: false, Logo: LinkedInLogo },
}

export function SnsChip({ entry }: { entry: SnsEntry }) {
  const brand = SNS_BRAND[entry.platform]
  const inner = (
    <>
      <brand.Logo className="w-3.5 h-3.5 flex-shrink-0" />
      {entry.avatarUrl && (
        <div className="w-4 h-4 relative rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/30">
          <Image src={entry.avatarUrl} alt="" fill className="object-cover" />
        </div>
      )}
      <span className="text-[11px] font-medium leading-none truncate max-w-[100px]">
        {brand.prefixAt ? `@${entry.username}` : entry.username}
      </span>
    </>
  )
  const className = `inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 ${brand.bg} ${brand.text} ${entry.url ? "hover:opacity-80 transition-opacity" : ""}`
  if (entry.url) {
    return (
      <a href={entry.url} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return <div className={className}>{inner}</div>
}

/** Convert Member.social object to SnsEntry array */
export function socialToSnsEntries(social?: {
  x?: string
  github?: string
  discord?: string
  linkedin?: string
  website?: string
}): SnsEntry[] {
  if (!social) return []
  const entries: SnsEntry[] = []
  if (social.github) {
    const username = social.github.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "")
    entries.push({ platform: "github", username, url: social.github })
  }
  if (social.x) {
    const username = social.x.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "").replace(/\/$/, "")
    entries.push({ platform: "x", username, url: social.x })
  }
  if (social.discord) {
    entries.push({ platform: "discord", username: social.discord, url: social.discord })
  }
  if (social.linkedin) {
    const username = social.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")
    entries.push({ platform: "linkedin", username, url: social.linkedin })
  }
  return entries
}

export function SnsChipsSection({ social, snsEntries }: { social?: { x?: string; github?: string; discord?: string; linkedin?: string; website?: string }; snsEntries?: SnsEntry[] }) {
  const entries = snsEntries ?? socialToSnsEntries(social)
  if (entries.length === 0) return null
  return (
    <div>
      <h4 className="font-bold text-sm text-muted-foreground mb-2">SNS</h4>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((entry) => (
          <SnsChip key={entry.platform} entry={entry} />
        ))}
      </div>
    </div>
  )
}
