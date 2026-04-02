"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Github, Linkedin, Globe } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
import Link from "next/link"
import type { Member } from "@/types/member"
import { getRingColorClass, getMemberTypeBadgeClass } from "@/types/member"

interface Props {
  members: Member[]
}

function getTileDisplay(member: Member) {
  if (member.nickname && member.nickname !== member.name) {
    return { main: member.nickname, sub: member.name }
  }
  return { main: member.name, sub: undefined }
}

export default function MemberList({ members }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {members.map((member) => {
          const { main, sub } = getTileDisplay(member)
          const ringClass = getRingColorClass(member.ringColor)
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedMember(member)}
              className="group flex flex-col items-center text-center rounded-xl p-3 hover:bg-white/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
            >
              <div className="relative flex-shrink-0">
                <div className={`w-16 h-16 relative rounded-full overflow-hidden ring-2 ${ringClass} transition-all`}>
                  <Image
                    src={member.faceImage || member.image || "/placeholder.svg"}
                    alt={`${member.name}の写真`}
                    fill
                    className="object-cover"
                  />
                </div>
                {member.snsAvatar && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden">
                    <Image
                      src={member.snsAvatar}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">
                {main}
              </p>
              {sub && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
                  {sub}
                </p>
              )}
              {member.memberType && (
                <span className={`mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getMemberTypeBadgeClass(member.memberType)}`}>
                  {member.memberType}
                </span>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
                {member.memberType === "卒業生" && member.currentOrg ? member.currentOrg : member.department}
              </p>
            </button>
          )
        })}
      </div>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && (() => {
            const { main, sub } = getTileDisplay(selectedMember)
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{main}</DialogTitle>
                  <DialogDescription className="text-accent font-medium">
                    {sub && <span className="mr-2">{sub}</span>}
                    {selectedMember.memberType && <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full mr-2 ${getMemberTypeBadgeClass(selectedMember.memberType)}`}>{selectedMember.memberType}</span>}
                    {selectedMember.role} | {selectedMember.memberType === "卒業生" && selectedMember.currentOrg ? selectedMember.currentOrg : selectedMember.department} {selectedMember.year}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mt-4">
                  <div className="relative">
                    <div className={`aspect-square relative rounded-lg overflow-hidden ring-2 ${getRingColorClass(selectedMember.ringColor)}`}>
                      <Image
                        src={selectedMember.faceImage || selectedMember.image || "/placeholder.svg"}
                        alt={`${selectedMember.name}の写真`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {selectedMember.snsAvatar && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden">
                        <Image
                          src={selectedMember.snsAvatar}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 mb-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedMember.bio}</ReactMarkdown>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-sm text-gray-500 mb-2">スキル</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMember.skills.map((skill, index) => (
                          <span key={index} className="bg-gray-100 text-primary text-xs px-2 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedMember.social && (
                      <div>
                        <h4 className="font-bold text-sm text-gray-500 mb-2">SNS / ウェブサイト</h4>
                        <div className="flex gap-3">
                          {selectedMember.social.github && (
                            <Link
                              href={selectedMember.social.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-accent transition-colors"
                              aria-label="GitHub"
                            >
                              <Github className="h-5 w-5" />
                            </Link>
                          )}
                          {selectedMember.social.x && (
                            <Link
                              href={selectedMember.social.x}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-accent transition-colors"
                              aria-label="X"
                            >
                              <XIcon className="h-5 w-5" />
                            </Link>
                          )}
                          {selectedMember.social.linkedin && (
                            <Link
                              href={selectedMember.social.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-accent transition-colors"
                              aria-label="LinkedIn"
                            >
                              <Linkedin className="h-5 w-5" />
                            </Link>
                          )}
                          {selectedMember.social.website && (
                            <Link
                              href={selectedMember.social.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-accent transition-colors"
                              aria-label="ウェブサイト"
                            >
                              <Globe className="h-5 w-5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
