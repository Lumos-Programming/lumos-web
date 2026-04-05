import { getPublicMembers } from "@/lib/members"
import MembersPageClient from "@/components/members-page-client"

export default async function MembersPage() {
  const members = await getPublicMembers()

  return <MembersPageClient members={members} />
}
