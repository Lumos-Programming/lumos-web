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

export default function MembersPageClient({ members }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">メンバー紹介</h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosを運営するメンバーたち。イベントの計画・運営を行っています。
            </p>
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {members.map((member) => {
              const { main, sub } = getTileDisplay(member)
              const ringClass = getRingColorClass(member.ringColor)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className="group flex flex-col items-center text-center rounded-xl p-3 hover:bg-white/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer bg-card border border-border"
                >
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 relative rounded-full overflow-hidden ring-2 ${ringClass} transition-all`}>
                    <Image
                      src={member.image || "/placeholder.svg"}
                      alt={`${member.name}の写真`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-2 text-sm font-bold text-foreground leading-tight truncate w-full">
                    {main}
                  </p>
                  {sub && (
                    <p className="text-xs text-muted-foreground truncate w-full">
                      {sub}
                    </p>
                  )}
                  {member.memberType && (
                    <span className={`mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getMemberTypeBadgeClass(member.memberType)}`}>
                      {member.memberType}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground truncate w-full">
                    {member.memberType === "卒業生" && member.currentOrg ? member.currentOrg : member.department}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && <MemberDetailContent member={selectedMember} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
