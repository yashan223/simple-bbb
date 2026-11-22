import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

function normalizeBBBUrl(rawUrl: string): string {
  const cleaned = rawUrl.trim().replace(/\/+$/, '')
  if (cleaned.endsWith('/api')) {
    return cleaned
  }
  if (cleaned.endsWith('/bigbluebutton')) {
    return `${cleaned}/api`
  }
  return `${cleaned}/bigbluebutton/api`
}

function getBBBConfig() {
  const url = process.env.BIGBLUEBUTTON_URL
  const secret = process.env.BIGBLUEBUTTON_SECRET

  if (!url || !secret) {
    throw new Error('BIGBLUEBUTTON_URL and BIGBLUEBUTTON_SECRET environment variables must be configured')
  }

  return {
    url: normalizeBBBUrl(url),
    secret,
  }
}

function computeChecksum(action: string, queryParamsString: string): string {
  const { secret } = getBBBConfig()
  const stringToHash = `${action}${queryParamsString}${secret}`
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex')
}

export function buildBBBUrl(
  action: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const { url } = getBBBConfig()
  const searchParams = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      searchParams.append(key, String(val))
    }
  }

  const queryParamsString = searchParams.toString()
  const checksum = computeChecksum(action, queryParamsString)
  searchParams.append('checksum', checksum)

  return `${url}/${action}?${searchParams.toString()}`
}

let cachedPresentationBase64: string | null = null

function getPresentationBase64(): string {
  if (cachedPresentationBase64) return cachedPresentationBase64
  try {
    const filePath = path.join(process.cwd(), 'public', 'presentation.pdf')
    if (fs.existsSync(filePath)) {
      cachedPresentationBase64 = fs.readFileSync(filePath).toString('base64')
      return cachedPresentationBase64
    }
  } catch (e) {
    console.error('Failed to read presentation.pdf:', e)
  }
  return ''
}

export async function createBBBMeeting({
  meetingId,
  name,
  attendeePassword,
  moderatorPassword,
  welcomeMessage,
  maxParticipants,
  isRecorded,
}: {
  meetingId: string
  name: string
  attendeePassword: string
  moderatorPassword: string
  welcomeMessage?: string | null
  maxParticipants?: number | null
  isRecorded?: boolean
}) {
  const url = buildBBBUrl('create', {
    name,
    meetingID: meetingId,
    attendeePW: attendeePassword,
    moderatorPW: moderatorPassword,
    welcome: welcomeMessage || `Welcome to ${name}!`,
    logoutURL: process.env.NEXTAUTH_URL || 'https://meeting.pulseedu.online',
    record: isRecorded ? 'true' : 'false',
    autoStartRecording: isRecorded ? 'true' : 'false',
    allowStartStopRecording: 'true',
    maxParticipants: maxParticipants && maxParticipants > 0 ? maxParticipants : undefined,
    meetingExpireWhenLastUserLeftInMinutes: 3,
  })

  const presentationBase64 = getPresentationBase64()
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<modules>
  <module name="presentation">
    <document url="https://meeting.pulseedu.online/presentation.pdf" filename="presentation.pdf" current="true">${presentationBase64}</document>
  </module>
</modules>`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xmlBody,
    })
    const xml = await res.text()
    const returncodeMatch = xml.match(/<returncode>(\w+)<\/returncode>/)
    const returncode = returncodeMatch ? returncodeMatch[1] : null

    if (returncode === 'SUCCESS') {
      return { success: true, xml }
    } else {
      const messageMatch = xml.match(/<message>([^<]+)<\/message>/)
      return { success: false, error: messageMatch ? messageMatch[1] : 'Failed to create meeting in BBB' }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error calling BigBlueButton'
    console.error('BBB createMeeting error:', message)
    return { success: false, error: message }
  }
}

export function getBBBJoinUrl({
  meetingId,
  fullName,
  password,
}: {
  meetingId: string
  fullName: string
  password: string
}): string {
  return buildBBBUrl('join', {
    meetingID: meetingId,
    fullName,
    password,
    redirect: 'true',
  })
}

export async function endBBBMeeting({
  meetingId,
  moderatorPassword,
}: {
  meetingId: string
  moderatorPassword: string
}) {
  const url = buildBBBUrl('end', {
    meetingID: meetingId,
    password: moderatorPassword,
  })

  try {
    const res = await fetch(url)
    const xml = await res.text()
    return xml.includes('<returncode>SUCCESS</returncode>')
  } catch (error) {
    console.error('BBB endMeeting error:', error)
    return false
  }
}

export async function isBBBMeetingRunning(meetingId: string): Promise<boolean> {
  const url = buildBBBUrl('isMeetingRunning', { meetingID: meetingId })
  try {
    const res = await fetch(url)
    const xml = await res.text()
    const runningMatch = xml.match(/<running>(\w+)<\/running>/)
    return runningMatch ? runningMatch[1] === 'true' : false
  } catch (error) {
    console.error('BBB isMeetingRunning error:', error)
    return false
  }
}

export async function getBBBMeetingInfo(
  meetingId: string,
  moderatorPassword?: string
): Promise<{
  success: boolean
  running: boolean
  participantCount: number
  hasUserJoined: boolean
  hasBeenForciblyEnded: boolean
  notFound: boolean
}> {
  const params: Record<string, string> = { meetingID: meetingId }
  if (moderatorPassword) {
    params.password = moderatorPassword
  }
  const url = buildBBBUrl('getMeetingInfo', params)
  try {
    const res = await fetch(url)
    const xml = await res.text()
    const returncodeMatch = xml.match(/<returncode>(\w+)<\/returncode>/)
    const messageKeyMatch = xml.match(/<messageKey>(\w+)<\/messageKey>/)
    const isRunningMatch = xml.match(/<running>(\w+)<\/running>/)
    const participantCountMatch = xml.match(/<participantCount>(\d+)<\/participantCount>/)
    const hasUserJoinedMatch = xml.match(/<hasUserJoined>(\w+)<\/hasUserJoined>/)
    const hasBeenForciblyEndedMatch = xml.match(/<hasBeenForciblyEnded>(\w+)<\/hasBeenForciblyEnded>/)

    const isSuccess = returncodeMatch ? returncodeMatch[1] === 'SUCCESS' : false
    const notFound = messageKeyMatch ? messageKeyMatch[1] === 'notFound' : false

    return {
      success: isSuccess,
      running: isRunningMatch ? isRunningMatch[1] === 'true' : false,
      participantCount: participantCountMatch ? parseInt(participantCountMatch[1], 10) : 0,
      hasUserJoined: hasUserJoinedMatch ? hasUserJoinedMatch[1] === 'true' : false,
      hasBeenForciblyEnded: hasBeenForciblyEndedMatch ? hasBeenForciblyEndedMatch[1] === 'true' : false,
      notFound,
    }
  } catch (error) {
    console.error('BBB getMeetingInfo error:', error)
    return {
      success: false,
      running: false,
      participantCount: 0,
      hasUserJoined: false,
      hasBeenForciblyEnded: false,
      notFound: false,
    }
  }
}

export interface BBBRecording {
  recordId: string
  meetingId: string
  name: string
  published: boolean
  state?: string
  startTime: number
  endTime: number
  playbackUrl?: string
  lengthMinutes?: number
}

export async function getBBBRecordings(meetingId?: string): Promise<BBBRecording[]> {
  const params: Record<string, string> = { state: 'any' }
  if (meetingId) params.meetingID = meetingId

  const url = buildBBBUrl('getRecordings', params)
  try {
    const res = await fetch(url)
    const xml = await res.text()
    if (!xml.includes('<returncode>SUCCESS</returncode>')) {
      return []
    }

    const recordings: BBBRecording[] = []
    const recordingBlocks = xml.match(/<recording>[\s\S]*?<\/recording>/g) || []

    for (const block of recordingBlocks) {
      const recordIdMatch = block.match(/<recordID>([^<]+)<\/recordID>/)
      const meetingIdMatch = block.match(/<meetingID>([^<]+)<\/meetingID>/)
      const nameMatch = block.match(/<name>([^<]+)<\/name>/)
      const publishedMatch = block.match(/<published>([^<]+)<\/published>/)
      const stateMatch = block.match(/<state>([^<]+)<\/state>/)
      const startTimeMatch = block.match(/<startTime>([^<]+)<\/startTime>/)
      const endTimeMatch = block.match(/<endTime>([^<]+)<\/endTime>/)
      const urlMatch = block.match(/<url>([^<]+)<\/url>/)
      const lengthMatch = block.match(/<length>([^<]+)<\/length>/)

      if (stateMatch && (stateMatch[1] === 'deleted' || stateMatch[1] === 'unprocessed_dismissed')) {
        continue
      }

      if (recordIdMatch && meetingIdMatch) {
        recordings.push({
          recordId: recordIdMatch[1],
          meetingId: meetingIdMatch[1],
          name: nameMatch ? nameMatch[1] : 'Meeting Session Recording',
          published: publishedMatch ? publishedMatch[1] === 'true' : true,
          state: stateMatch ? stateMatch[1] : 'published',
          startTime: startTimeMatch ? Number(startTimeMatch[1]) : Date.now(),
          endTime: endTimeMatch ? Number(endTimeMatch[1]) : Date.now(),
          playbackUrl: urlMatch ? urlMatch[1] : undefined,
          lengthMinutes: lengthMatch ? Number(lengthMatch[1]) : undefined,
        })
      }
    }

    return recordings
  } catch (error) {
    console.error('Failed to get BBB recordings:', error)
    return []
  }
}

export async function deleteBBBRecording(recordId: string): Promise<boolean> {
  const url = buildBBBUrl('deleteRecordings', { recordID: recordId })
  try {
    const res = await fetch(url)
    const xml = await res.text()
    return (
      xml.includes('<returncode>SUCCESS</returncode>') ||
      xml.includes('<messageKey>notFound</messageKey>') ||
      xml.includes('We could not find recordings')
    )
  } catch (error) {
    console.error('Failed to delete BBB recording:', error)
    return false
  }
}
