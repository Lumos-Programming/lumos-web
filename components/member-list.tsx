"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MemberDetailContent } from "@/components/member-detail-shared"
import { MemberTile } from "@/components/member-tile"
import type { Member } from "@/types/member"
import { getTileDisplay } from "@/types/member"

interface Props {
  members: Member[]
}

export default function MemberList({ members }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {members.map((member) => (
          <MemberTile
            key={member.id}
            {...getTileDisplay(member)}
            department={member.department}
            image={member.faceImage || member.image || "/placeholder.svg"}
            snsAvatar={member.snsAvatar}
            ringColor={member.ringColor}
            memberType={member.memberType}
            year={member.year}
            currentOrg={member.currentOrg}
            topInterests={member.topInterests}
            onClick={() => setSelectedMember(member)}
          />
        ))}
      </div>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && <MemberDetailContent member={selectedMember} showSnsAvatar />}
        </DialogContent>
      </Dialog>
    </>
  )
}
