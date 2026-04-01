import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMember, updateMember, isOnboardingComplete } from '@/lib/members'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const member = await getMember(session.user.id)
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (isOnboardingComplete(member)) {
    return NextResponse.json({ error: 'Already completed' }, { status: 400 })
  }

  if (!member.studentId || !member.lastName || !member.firstName || !member.faculty) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!member.lineId) {
    return NextResponse.json({ error: 'LINE account not linked' }, { status: 400 })
  }

  // Set visibility defaults for required fields
  await updateMember(session.user.id, {
    visibility: {
      ...member.visibility,
      lastName: true,
      firstName: true,
      faculty: true,
    },
  })

  return NextResponse.json({ success: true })
}
