import Image from "next/image"
import Link from "next/link"
import { Github, Linkedin, Globe } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { Member } from "@/types/member"
import { getRingColorClass, getMemberTypeBadgeClass } from "@/types/member"

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
      <p className={`${clamp ? "text-xs" : "text-sm"} text-gray-400 dark:text-gray-500`}>自己紹介文は登録されていません</p>
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
  const hasAny = social.github || social.x || social.linkedin || social.website
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
              {member.memberType}
            </span>
          )}
          {member.role} | {member.memberType === "卒業生" && member.currentOrg ? member.currentOrg : member.department} {member.year}
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
          <SkillsSection skills={member.skills} />
          <SocialLinksSection social={member.social} />
        </div>
      </div>
    </>
  )
}
