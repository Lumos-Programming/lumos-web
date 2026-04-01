import ProfileEdit from "@/components/profile-edit"

export default async function ProfileEditPage() {
  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <ProfileEdit />
      </div>
    </div>
  )
}
