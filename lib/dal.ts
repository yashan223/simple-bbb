import { cache } from 'react'
import { getSession } from './session'
import { prisma } from './prisma'

export interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: Date
  isDefaultAdmin: boolean
}

/**
 * Returns the configured default admin email (lowercased)
 */
export function getDefaultAdminEmail(): string {
  return (process.env.DEFAULT_ADMIN_EMAIL || 'admin@pulseedu.online').toLowerCase().trim()
}

/**
 * Checks if a given email belongs to the primary default administrator
 */
export function isDefaultAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === getDefaultAdminEmail()
}

/**
 * Data Access Layer helper: validates session and returns current admin
 */
export const verifyAdminSession = cache(async (): Promise<{ isAuth: true; user: AdminUser } | null> => {
  const session = await getSession()
  if (!session?.userId) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      isAuth: true,
      user: {
        ...user,
        isDefaultAdmin: isDefaultAdmin(user.email),
      },
    }
  } catch (error) {
    console.error('Failed to verify admin in database:', error)
    return null
  }
})

/**
 * Ensures caller is an authenticated admin, throwing an error if unauthenticated
 */
export async function requireAdmin(): Promise<AdminUser> {
  const auth = await verifyAdminSession()
  if (!auth) {
    throw new Error('Unauthorized: Admin account required')
  }
  return auth.user
}
