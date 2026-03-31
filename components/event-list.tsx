"use client"

import { useEffect, useState } from "react"
import type { Event } from "@/types/event"

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data: Event[]) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-center text-gray-500 py-12">読み込み中...</p>
  }

  if (events.length === 0) {
    return <p className="text-center text-gray-500 py-12">イベントはまだありません。</p>
  }

  return (
    <ul className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <span className="text-sm text-gray-500">{event.date}</span>
          </div>
          {event.location && (
            <p className="text-sm text-gray-500 mb-2">{event.location}</p>
          )}
          <p className="text-gray-700 text-sm">{event.description}</p>
        </li>
      ))}
    </ul>
  )
}
