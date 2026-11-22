import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { endBBBMeeting } from '@/lib/bbb'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const meeting = await prisma.meeting.findUnique({
      where: { id },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    try {
      await endBBBMeeting({
        meetingId: meeting.meetingId,
        moderatorPassword: meeting.moderatorPassword,
      })
    } catch (e) {
      console.warn('Could not end meeting on BBB server (might not be running):', e)
    }

    await prisma.meeting.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Meeting deleted successfully' })
  } catch (error) {
    console.error('Failed to delete meeting:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
