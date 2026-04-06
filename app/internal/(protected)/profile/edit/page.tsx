import ProfileEdit from "@/components/profile-edit";
import { PageHeader } from "@/components/page-header";

export default async function ProfileEditPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <PageHeader title="プロフィール編集" />
      <ProfileEdit />
    </div>
  );
}
