'use client'

import { useState } from 'react'
import { InterestedUsers } from './InterestedUsers'
import { DiscordEventCTA } from './DiscordEventCTA'

type DiscordEventSectionProps = {
  eventId: string
  eventUrl?: string
  currentUserId?: string
}

export function DiscordEventSection({
  eventId,
  eventUrl,
  currentUserId,
}: DiscordEventSectionProps) {
  const [isUserInterested, setIsUserInterested] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="space-y-3 mb-4">
      {!isLoading && !isUserInterested && <DiscordEventCTA eventUrl={eventUrl} />}
      <InterestedUsers
        eventId={eventId}
        currentUserId={currentUserId}
        onUserInterestedChange={setIsUserInterested}
        onLoadingChange={setIsLoading}
      />
    </div>
  )
}
