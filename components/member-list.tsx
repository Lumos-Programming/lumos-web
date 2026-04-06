"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MemberDetailContent } from "@/components/member-detail-shared";
import { MemberTile } from "@/components/member-tile";
import type { Member } from "@/types/member";
import { getTileDisplay } from "@/types/member";

interface Props {
  members: Member[];
}

export default function MemberList({ members }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const memberId = searchParams.get("member");
  const selectedMember = useMemo(() => {
    if (!memberId) return null;
    return members.find((m) => m.id === memberId) ?? null;
  }, [memberId, members]);

  const handleSelect = (member: Member) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("member", member.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("member");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {members.map((member, i) => (
          <div
            key={member.id}
            className="animate-spring-up fill-mode-backwards"
            style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
          >
            <MemberTile
              {...getTileDisplay(member)}
              department={member.department}
              image={member.faceImage || member.image || "/placeholder.svg"}
              snsAvatar={member.snsAvatar}
              ringColor={member.ringColor}
              memberType={member.memberType}
              year={member.year}
              currentOrg={member.currentOrg}
              topInterests={member.topInterests}
              onClick={() => handleSelect(member)}
            />
          </div>
        ))}
      </div>

      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedMember && <MemberDetailContent member={selectedMember} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
