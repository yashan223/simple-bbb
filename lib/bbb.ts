import crypto from 'crypto'

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

// 1-page blank PDF (16:9 1920x1080) encoded in Base64 to override default BBB marketing slides
const BLANK_WHITEBOARD_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+IGVuZG9iagoyIDAgb2JqIDw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PiBlbmRvYmoKMyAwIG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTkyMCAxMDgwXSAvUmVzb3VyY2VzIDw8Pj4+PiBlbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyIDw8L1NpemUgNCAvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoyMDgKJSVFT0YK'

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
    record: isRecorded ? 'true' : 'false',
    maxParticipants: maxParticipants && maxParticipants > 0 ? maxParticipants : undefined,
    meetingExpireIfNoUserJoinedInMinutes: 3,
    meetingExpireWhenLastUserLeftInMinutes: 3,
  })

  // Pre-load clean blank whiteboard presentation to replace BBB default branded slides
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<modules>
  <module name="presentation">
    <document name="whiteboard.pdf" current="true" downloadable="false">${BLANK_WHITEBOARD_PDF_BASE64}</document>
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

/**
 * Checks if a meeting is actively running on BigBlueButton
 */
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

/**
 * Gets live meeting info from BigBlueButton
 */
export async function getBBBMeetingInfo(meetingId: string): Promise<{
  success: boolean
  running: boolean
  participantCount: number
}> {
  const url = buildBBBUrl('getMeetingInfo', { meetingID: meetingId })
  try {
    const res = await fetch(url)
    const xml = await res.text()
    const returncodeMatch = xml.match(/<returncode>(\w+)<\/returncode>/)
    const isRunningMatch = xml.match(/<running>(\w+)<\/running>/)
    const participantCountMatch = xml.match(/<participantCount>(\d+)<\/participantCount>/)

    return {
      success: returncodeMatch ? returncodeMatch[1] === 'SUCCESS' : false,
      running: isRunningMatch ? isRunningMatch[1] === 'true' : false,
      participantCount: participantCountMatch ? parseInt(participantCountMatch[1], 10) : 0,
    }
  } catch (error) {
    console.error('BBB getMeetingInfo error:', error)
    return { success: false, running: false, participantCount: 0 }
  }
}

export interface BBBRecording {
  recordId: string
  meetingId: string
  name: string
  published: boolean
  startTime: number
  endTime: number
  playbackUrl?: string
  lengthMinutes?: number
}

export async function getBBBRecordings(meetingId?: string): Promise<BBBRecording[]> {
  const params: Record<string, string> = {}
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
      const startTimeMatch = block.match(/<startTime>([^<]+)<\/startTime>/)
      const endTimeMatch = block.match(/<endTime>([^<]+)<\/endTime>/)
      const urlMatch = block.match(/<url>([^<]+)<\/url>/)
      const lengthMatch = block.match(/<length>([^<]+)<\/length>/)

      if (recordIdMatch && meetingIdMatch) {
        recordings.push({
          recordId: recordIdMatch[1],
          meetingId: meetingIdMatch[1],
          name: nameMatch ? nameMatch[1] : 'Meeting Session Recording',
          published: publishedMatch ? publishedMatch[1] === 'true' : true,
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
    return xml.includes('<returncode>SUCCESS</returncode>')
  } catch (error) {
    console.error('Failed to delete BBB recording:', error)
    return false
  }
}
