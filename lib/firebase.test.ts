import { describe, it, expect, beforeEach } from 'vitest'
import * as firebaseAdmin from 'firebase-admin'
import { getWeekData, addTalk, updateTalk, deleteTalk } from './mini-lt/firebase'

// Initialize Firebase for tests
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
  })
}

describe('Firebase CRUD Logic', () => {
  const weekId = '2026-W09'
  const userId = 'user-123'
  const otherUserId = 'user-456'

  beforeEach(async () => {
    // Clear Firestore before each test
    const db = firebaseAdmin.firestore()
    const collections = await db.listCollections()
    for (const collection of collections) {
      const docs = await collection.listDocuments()
      for (const doc of docs) {
        await doc.delete()
      }
    }
  })

  it('should get empty week data if no document exists', async () => {
    const data = await getWeekData(weekId)
    expect(data.weekString).toBe(weekId)
    expect(data.talks).toHaveLength(0)
  })

  it('should add a talk and create the week document if it does not exist', async () => {
    const talkData = {
      title: 'Test Title',
      description: 'Test Description',
      presenterName: 'Test User',
      presenterAvatar: 'https://example.com/avatar.png',
      duration: 5,
    }

    await addTalk(weekId, talkData, userId)
    const data = await getWeekData(weekId)

    expect(data.talks).toHaveLength(1)
    expect(data.talks[0].title).toBe('Test Title')
    expect(data.talks[0].presenterUid).toBe(userId)
  })

  it('should update a talk if the user is the owner', async () => {
    const talkData = {
      title: 'Initial Title',
      description: 'Initial Description',
      presenterName: 'Test User',
      presenterAvatar: 'https://example.com/avatar.png',
      duration: 5,
    }

    await addTalk(weekId, talkData, userId)
    const initialData = await getWeekData(weekId)
    const talkId = initialData.talks[0].id

    await updateTalk(weekId, talkId, { title: 'Updated Title' }, userId)
    const updatedData = await getWeekData(weekId)

    expect(updatedData.talks[0].title).toBe('Updated Title')
  })

  it('should throw an error if updating a talk of another user', async () => {
    const talkData = {
      title: 'Initial Title',
      description: 'Initial Description',
      presenterName: 'Test User',
      presenterAvatar: 'https://example.com/avatar.png',
      duration: 5,
    }

    await addTalk(weekId, talkData, userId)
    const initialData = await getWeekData(weekId)
    const talkId = initialData.talks[0].id

    await expect(
      updateTalk(weekId, talkId, { title: 'Hacked Title' }, otherUserId)
    ).rejects.toThrow('Unauthorized')
  })

  it('should delete a talk if the user is the owner', async () => {
    const talkData = {
      title: 'To be deleted',
      description: 'Initial Description',
      presenterName: 'Test User',
      presenterAvatar: 'https://example.com/avatar.png',
      duration: 5,
    }

    await addTalk(weekId, talkData, userId)
    const initialData = await getWeekData(weekId)
    const talkId = initialData.talks[0].id

    await deleteTalk(weekId, talkId, userId)
    const finalData = await getWeekData(weekId)

    expect(finalData.talks).toHaveLength(0)
  })

  it('should throw an error if deleting a talk of another user', async () => {
    const talkData = {
      title: 'Try to delete me',
      description: 'Initial Description',
      presenterName: 'Test User',
      presenterAvatar: 'https://example.com/avatar.png',
      duration: 5,
    }

    await addTalk(weekId, talkData, userId)
    const initialData = await getWeekData(weekId)
    const talkId = initialData.talks[0].id

    await expect(deleteTalk(weekId, talkId, otherUserId)).rejects.toThrow('Unauthorized')
  })

  it('should increment order correctly when adding multiple talks', async () => {
    const talkData = {
      title: 'Talk 1',
      description: 'Desc 1',
      presenterName: 'User 1',
      presenterAvatar: 'avatar1',
      duration: 5,
    }

    await addTalk(weekId, talkData, 'user1')
    await addTalk(weekId, { ...talkData, title: 'Talk 2' }, 'user2')

    const data = await getWeekData(weekId)
    expect(data.talks[0].order).toBe(1)
    expect(data.talks[1].order).toBe(2)
  })
})
