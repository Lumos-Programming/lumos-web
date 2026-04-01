"use client"

import EventList from "@/components/event-list"

export default function EventsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <h1 className="text-3xl font-bold mb-6">イベント一覧</h1>
                <EventList />
            </div>
        </div>
    )
}
