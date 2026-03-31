import * as admin from 'firebase-admin'
import { getDb } from '@/lib/firebase'

export type Talk = {
  id: string
  title: string
  description: string
  duration: number // Duration in minutes (1, 3, 5, 7, 10, 15)
  presenterUid: string
  presenterName: string
  presenterAvatar: string
  order: number
  createdAt: admin.firestore.Timestamp
}

export type SerializableTalk = Omit<Talk, 'createdAt'> & {
  createdAt: number
}

export type WeekData = {
  weekString: string
  eventStartTime: string
  talks: Talk[]
  discordEventId?: string
  discordEventUrl?: string
}

export type SerializableWeekData = Omit<WeekData, 'talks'> & {
  talks: SerializableTalk[]
}

export async function getWeekData(weekId: string): Promise<SerializableWeekData> {
  const doc = await getDb().collection('weeks').doc(weekId).get()
  if (!doc.exists) {
    return {
      weekString: weekId,
      eventStartTime: '21:00',
      talks: [],
    }
  }
  const data = doc.data() as WeekData
  return {
    ...data,
    talks: data.talks.map(talk => ({
      ...talk,
      createdAt: talk.createdAt.toMillis(),
    })),
  }
}

export async function addTalk(
  weekId: string,
  talkData: Omit<Talk, 'id' | 'createdAt' | 'order' | 'presenterUid'>,
  userId: string
): Promise<void> {
  const db = getDb()
  const weekRef = db.collection('weeks').doc(weekId)

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(weekRef)
    let talks: Talk[] = []
    if (doc.exists) {
      talks = (doc.data() as WeekData).talks || []
    }

    const existingTalk = talks.find(t => t.presenterUid === userId)
    if (existingTalk) {
      throw new Error('週に1件まで発表を登録できます')
    }

    const newTalk: Talk = {
      ...talkData,
      id: crypto.randomUUID(),
      presenterUid: userId,
      order: talks.length + 1,
      createdAt: admin.firestore.Timestamp.now(),
    }

    talks.push(newTalk)

    transaction.set(
      weekRef,
      {
        weekString: weekId,
        eventStartTime: '21:00',
        talks: talks,
      },
      { merge: true }
    )
  })
}

export async function updateTalk(
  weekId: string,
  talkId: string,
  updates: Partial<Pick<Talk, 'title' | 'description' | 'duration'>>,
  userId: string
): Promise<void> {
  const db = getDb()
  const weekRef = db.collection('weeks').doc(weekId)

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(weekRef)
    if (!doc.exists) throw new Error('Week not found')

    const data = doc.data() as WeekData
    const talks = data.talks.map(t => {
      if (t.id === talkId) {
        if (t.presenterUid !== userId) throw new Error('Unauthorized')
        return { ...t, ...updates }
      }
      return t
    })

    transaction.update(weekRef, { talks })
  })
}

export async function deleteTalk(weekId: string, talkId: string, userId: string): Promise<void> {
  const db = getDb()
  const weekRef = db.collection('weeks').doc(weekId)

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(weekRef)
    if (!doc.exists) return

    const data = doc.data() as WeekData
    const talkToDelete = data.talks.find(t => t.id === talkId)
    if (!talkToDelete) return
    if (talkToDelete.presenterUid !== userId) throw new Error('Unauthorized')

    const talks = data.talks.filter(t => t.id !== talkId)
    transaction.update(weekRef, { talks })
  })
}

export async function saveDiscordEvent(
  weekId: string,
  eventId: string,
  eventUrl: string
): Promise<void> {
  const db = getDb()
  const weekRef = db.collection('weeks').doc(weekId)

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(weekRef)

    if (doc.exists) {
      transaction.update(weekRef, {
        discordEventId: eventId,
        discordEventUrl: eventUrl,
      })
    } else {
      transaction.set(weekRef, {
        weekString: weekId,
        eventStartTime: '21:00',
        talks: [],
        discordEventId: eventId,
        discordEventUrl: eventUrl,
      })
    }
  })
}

export async function removeDiscordEvent(weekId: string): Promise<void> {
  const db = getDb()
  const weekRef = db.collection('weeks').doc(weekId)

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(weekRef)
    if (!doc.exists) return

    transaction.update(weekRef, {
      discordEventId: admin.firestore.FieldValue.delete(),
      discordEventUrl: admin.firestore.FieldValue.delete(),
    })
  })
}
