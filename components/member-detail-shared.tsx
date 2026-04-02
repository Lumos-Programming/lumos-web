import Image from "next/image"
import Link from "next/link"
import { Github, Linkedin, Globe } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { Member } from "@/types/member"
import { getRingColorClass, getMemberTypeBadgeClass, getMemberTypeBadgeLabel } from "@/types/member"

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// --- BioSection ---

export function BioSection({ bio, clamp }: { bio?: string; clamp?: boolean }) {
  if (bio) {
    return (
      <div className={`prose prose-sm dark:prose-invert max-w-none text-foreground ${clamp ? "line-clamp-3 text-xs text-gray-600 dark:text-gray-400" : ""}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{bio}</ReactMarkdown>
      </div>
    )
  }
  return (
    <div className={`rounded-lg bg-gray-100 dark:bg-gray-800 ${clamp ? "py-8" : "py-10"} flex items-center justify-center`}>
      <p className={`${clamp ? "text-xs" : "text-sm"} text-gray-400 dark:text-gray-500`}>プロフィール文は登録されていません</p>
    </div>
  )
}

// --- InterestsSection ---

export function InterestsSection({ interests }: { interests?: string[] }) {
  if (!interests || interests.length === 0) return null
  return (
    <div className="mb-4">
      <h4 className="font-bold text-sm text-muted-foreground mb-2">興味分野</h4>
      <div className="flex flex-wrap gap-2">
        {interests.map((tag, index) => (
          <span key={index} className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// --- SkillsSection ---

export function SkillsSection({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null
  return (
    <div className="mb-4">
      <h4 className="font-bold text-sm text-muted-foreground mb-2">スキル</h4>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span key={index} className="bg-secondary text-primary text-xs px-2 py-1 rounded-full">
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}

// --- SocialLinksSection ---

export function SocialLinksSection({ social }: { social: Member["social"] }) {
  if (!social) return null
  const hasAny = social.github || social.x || social.linkedin || social.discord || social.website
  if (!hasAny) return null
  return (
    <div>
      <h4 className="font-bold text-sm text-muted-foreground mb-2">SNS / ウェブサイト</h4>
      <div className="flex gap-3">
        {social.github && (
          <Link href={social.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-accent transition-colors" aria-label="GitHub">
            <Github className="h-5 w-5" />
          </Link>
        )}
        {social.x && (
          <Link href={social.x} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-accent transition-colors" aria-label="X">
            <XIcon className="h-5 w-5" />
          </Link>
        )}
        {social.discord && (
          <Link href={social.discord} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-accent transition-colors" aria-label="Discord">
            <DiscordIcon className="h-5 w-5" />
          </Link>
        )}
        {social.linkedin && (
          <Link href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-accent transition-colors" aria-label="LinkedIn">
            <Linkedin className="h-5 w-5" />
          </Link>
        )}
        {social.website && (
          <Link href={social.website} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-accent transition-colors" aria-label="ウェブサイト">
            <Globe className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  )
}

// --- MemberDetailContent ---

function getTileDisplay(member: Member) {
  if (member.nickname && member.nickname !== member.name) {
    return { main: member.nickname, sub: member.name }
  }
  return { main: member.name, sub: undefined }
}

export function MemberDetailContent({ member, showSnsAvatar }: { member: Member; showSnsAvatar?: boolean }) {
  const { main, sub } = getTileDisplay(member)
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl text-foreground">{main}</DialogTitle>
        <DialogDescription className="text-accent-foreground font-medium">
          {sub && <span className="mr-2">{sub}</span>}
          {member.memberType && (
            <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full mr-2 ${getMemberTypeBadgeClass(member.memberType)}`}>
              {getMemberTypeBadgeLabel(member.memberType, member.year)}
            </span>
          )}
          {member.role} | {member.memberType === "卒業生" && member.currentOrg ? member.currentOrg : member.department}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mt-4">
        <div className={showSnsAvatar ? "relative" : "flex justify-center"}>
          <div className={`${showSnsAvatar ? "aspect-square" : "w-40 h-40"} relative ${showSnsAvatar ? "rounded-lg" : "rounded-full"} overflow-hidden ring-2 ${getRingColorClass(member.ringColor)}`}>
            <Image
              src={(showSnsAvatar ? member.faceImage || member.image : member.image) || "/placeholder.svg"}
              alt={`${member.name}の写真`}
              fill
              className="object-cover"
            />
          </div>
          {showSnsAvatar && member.snsAvatar && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden">
              <Image src={member.snsAvatar} alt="" fill className="object-cover" />
            </div>
          )}
        </div>
        <div>
          <div className="mb-4">
            <BioSection bio={member.bio} />
          </div>
          <InterestsSection interests={member.interests} />
          <SkillsSection skills={member.skills} />
          <SocialLinksSection social={member.social} />
        </div>
      </div>
    </>
  )
}
