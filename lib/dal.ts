import { cache } from 'react'
import { getSession } from './session'
import { prisma } from './prisma'

export interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: Date
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

    return { isAuth: true, user }
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
