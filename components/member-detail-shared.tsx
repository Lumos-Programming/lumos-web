import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { Member } from "@/types/member"
import { getRingColorClass, getMemberTypeBadgeClass, getMemberTypeBadgeLabel, getTileDisplay } from "@/types/member"
import { SnsChipsSection } from "@/components/sns-chips"

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

// --- MemberDetailContent ---

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
          <SnsChipsSection social={member.social} />
        </div>
      </div>
    </>
  )
}
