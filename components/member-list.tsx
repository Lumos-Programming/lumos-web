"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Github, Linkedin, Globe } from "lucide-react"

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
import Link from "next/link"
import type { Member } from "@/types/member"

interface Props {
  members: Member[]
}

export default function MemberList({ members }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setSelectedMember(member)}
            className="group flex flex-col items-center text-center rounded-xl p-3 hover:bg-white/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
          >
            <div className="w-16 h-16 relative rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-purple-300 dark:group-hover:ring-purple-600 transition-all flex-shrink-0">
              <Image
                src={member.image || "/placeholder.svg"}
                alt={`${member.name}の写真`}
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">
              {member.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
              {member.department}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedMember.name}</DialogTitle>
                <DialogDescription className="text-accent font-medium">
                  {selectedMember.role} | {selectedMember.department} {selectedMember.year}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mt-4">
                <div className="aspect-square relative rounded-lg overflow-hidden">
                  <Image
                    src={selectedMember.image || "/placeholder.svg"}
                    alt={`${selectedMember.name}の写真`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-gray-700 mb-4">{selectedMember.bio}</p>
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
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
