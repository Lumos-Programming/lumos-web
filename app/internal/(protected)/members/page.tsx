import { getMembersInternal } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { InternalMemberSearch } from "@/components/internal-member-search";

export default async function InternalMembersPage() {
  const members = await getMembersInternal();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-spring-up">
      <PageHeader
        title="メンバー一覧"
        description={`${members.length}名のメンバー`}
      />
      <InternalMemberSearch members={members} />
    </div>
  );
}
