import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { createBBBMeeting } from '@/lib/bbb'

const CreateMeetingSchema = z.object({
  name: z.string().min(2, 'Meeting name must be at least 2 characters'),
  meetingId: z.string().optional(),
  attendeePassword: z.string().optional(),
  moderatorPassword: z.string().optional(),
  welcomeMessage: z.string().optional(),
  maxParticipants: z.number().int().nonnegative().optional().default(0),
  isRecorded: z.boolean().optional().default(false),
})

// GET /api/admin/meetings - List all meetings
export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error('Failed to list meetings:', error)
    return NextResponse.json({ error: 'Failed to retrieve meetings' }, { status: 500 })
  }
}

// POST /api/admin/meetings - Create meeting
export async function POST(request: Request) {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validation = CreateMeetingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const data = validation.data
    const meetingId = data.meetingId?.trim() || `pulse-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const attendeePassword = data.attendeePassword?.trim() || `att-${crypto.randomBytes(3).toString('hex')}`
    const moderatorPassword = data.moderatorPassword?.trim() || `mod-${crypto.randomBytes(4).toString('hex')}`

    // Pre-create or initialize meeting on BigBlueButton server
    await createBBBMeeting({
      meetingId,
      name: data.name,
      attendeePassword,
      moderatorPassword,
      welcomeMessage: data.welcomeMessage,
      maxParticipants: data.maxParticipants,
      isRecorded: data.isRecorded,
    })

    const meeting = await prisma.meeting.create({
      data: {
        name: data.name,
        meetingId,
        attendeePassword,
        moderatorPassword,
        welcomeMessage: data.welcomeMessage,
        maxParticipants: data.maxParticipants,
        isRecorded: data.isRecorded,
        createdById: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, meeting }, { status: 201 })
  } catch (error) {
    console.error('Failed to create meeting:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
