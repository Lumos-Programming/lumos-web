import { getMembersInternal } from "@/lib/members"
import { PageHeader } from "@/components/page-header"
import { MemberSearch } from "@/components/member-search"

export default async function MembersPage() {
  const members = await getMembersInternal()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-spring-up">
      <PageHeader
        title="メンバー一覧"
        description={`${members.length}名のメンバー`}
      />
      <MemberSearch members={members} />
    </div>
  )
}
