import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { createBBBMeeting, getBBBMeetingInfo } from '@/lib/bbb'

const CreateMeetingSchema = z.object({
  name: z.string().min(2, 'Meeting name must be at least 2 characters'),
  meetingId: z.string().optional(),
  attendeePassword: z.string().optional(),
  moderatorPassword: z.string().optional(),
  welcomeMessage: z.string().optional(),
  maxParticipants: z.number().int().nonnegative().optional().default(0),
  isRecorded: z.boolean().optional().default(false),
})

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const updatedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        if (meeting.isEnded) {
          return meeting
        }

        try {
          const info = await getBBBMeetingInfo(meeting.meetingId, meeting.moderatorPassword)

          let hasStarted = meeting.hasStarted
          if (!hasStarted && (info.hasUserJoined || info.running)) {
            hasStarted = true
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: { hasStarted: true },
            })
            meeting.hasStarted = true
          }

          if (hasStarted) {
            const endedOnBBB =
              info.hasBeenForciblyEnded ||
              info.notFound ||
              (!info.running && info.hasUserJoined)

            if (endedOnBBB) {
              const endedMeeting = await prisma.meeting.update({
                where: { id: meeting.id },
                data: { isEnded: true, endedAt: new Date() },
              })
              return endedMeeting
            }
          }
        } catch (err) {
          console.error('Error syncing meeting status with BBB:', meeting.meetingId, err)
        }

        return meeting
      })
    )

    return NextResponse.json({ meetings: updatedMeetings })
  } catch (error) {
    console.error('Failed to list meetings:', error)
    return NextResponse.json({ error: 'Failed to retrieve meetings' }, { status: 500 })
  }
}

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
