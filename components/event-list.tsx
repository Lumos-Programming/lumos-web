"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, MapPin } from "lucide-react"
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
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <Skeleton className="h-10 w-20 rounded-lg shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">イベントはまだありません</p>
          <p className="text-muted-foreground/60 text-sm mt-1">イベントが登録されると、ここに表示されます。</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <Card
          key={event.id}
          className={`hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200 stagger-${Math.min(i + 1, 5)} animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-backwards`}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {event.date}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
