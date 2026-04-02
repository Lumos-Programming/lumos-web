"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MemberDetailContent } from "@/components/member-detail-shared"
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
          {selectedMember && <MemberDetailContent member={selectedMember} showSnsAvatar />}
        </DialogContent>
      </Dialog>
    </>
  )
}
