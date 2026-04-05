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

export default function MembersPageClient({ members }: Props) {
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
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">
              メンバー紹介
            </h1>
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
            {members.map((member) => (
              <MemberTile
                key={member.id}
                {...getTileDisplay(member)}
                department={member.department}
                image={member.image || "/placeholder.svg"}
                ringColor={member.ringColor}
                memberType={member.memberType}
                year={member.year}
                currentOrg={member.currentOrg}
                topInterests={member.topInterests}
                avatarSize="md"
                onClick={() => handleSelect(member)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
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
