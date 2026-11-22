import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export interface SessionPayload {
  userId: string
  email: string
  expiresAt: Date
}

export const SESSION_COOKIE_NAME = 'pulseedu_session'

function getEncodedKey(): Uint8Array {
  const secretKey = process.env.SESSION_SECRET
  if (!secretKey) {
    throw new Error('SESSION_SECRET environment variable is missing')
  }
  return new TextEncoder().encode(secretKey)
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  const encodedKey = getEncodedKey()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const encodedKey = getEncodedKey()
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await encrypt({ userId, email, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return decrypt(token)
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
