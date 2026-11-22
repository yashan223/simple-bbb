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
  })

  try {
    const res = await fetch(url)
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
