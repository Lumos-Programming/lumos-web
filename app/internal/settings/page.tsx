"use client"

import ProfileEdit from "@/components/profile-edit"

export default function SettingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                <h2 className="text-2xl font-semibold mb-4">設定</h2>
                <ProfileEdit />
            </div>
        </div>
    )
}
