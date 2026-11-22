import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { createBBBMeeting, getBBBJoinUrl } from '@/lib/bbb'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/meetings/[id]/join-moderator - Get moderator join URL (admin only)
export async function GET(request: Request, context: RouteContext) {
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

    // Ensure meeting exists on BBB
    await createBBBMeeting({
      meetingId: meeting.meetingId,
      name: meeting.name,
      attendeePassword: meeting.attendeePassword,
      moderatorPassword: meeting.moderatorPassword,
      welcomeMessage: meeting.welcomeMessage,
      maxParticipants: meeting.maxParticipants,
      isRecorded: meeting.isRecorded,
    })

    const joinUrl = getBBBJoinUrl({
      meetingId: meeting.meetingId,
      fullName: auth.user.name || 'Admin Moderator',
      password: meeting.moderatorPassword,
    })

    return NextResponse.json({ joinUrl })
  } catch (error) {
    console.error('Failed to generate moderator join url:', error)
    return NextResponse.json({ error: 'Failed to generate moderator join link' }, { status: 500 })
  }
}
