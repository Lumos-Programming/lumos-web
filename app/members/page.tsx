import { getMembers } from "@/lib/members"
import MembersPageClient from "@/components/members-page-client"

export default async function MembersPage() {
  const members = await getMembers()

  return <MembersPageClient members={members} />
}
