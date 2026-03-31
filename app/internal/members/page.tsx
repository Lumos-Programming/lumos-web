"use client"

import MemberList from "@/components/member-list"

export default function MembersPage() {
    return (
        <div className="min-h-screen bg-purple-50 dark:bg-gradient-to-br dark:from-black dark:to-purple-900">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <h1 className="text-3xl font-bold mb-6">メンバー一覧</h1>
                <MemberList />
            </div>
        </div>
    )
}
