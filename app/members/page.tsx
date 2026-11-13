import { getPublicMembers } from "@/lib/members";
import { attachGithubContributions } from "@/lib/github-contributions";
import MembersPageClient from "@/components/members-page-client";

export default async function MembersPage() {
  const members = await attachGithubContributions(await getPublicMembers());

  return <MembersPageClient members={members} />;
}
