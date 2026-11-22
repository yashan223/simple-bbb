import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession, isDefaultAdmin } from '@/lib/dal'

const CreateAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

// GET /api/admin/users - List all admin accounts (requires authenticated admin)
export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const usersWithRole = users.map((u) => ({
      ...u,
      isDefaultAdmin: isDefaultAdmin(u.email),
    }))

    return NextResponse.json({ users: usersWithRole })
  } catch (error) {
    console.error('Failed to list admin users:', error)
    return NextResponse.json({ error: 'Failed to retrieve admin accounts' }, { status: 500 })
  }
}

// POST /api/admin/users - Create additional admin account (ONLY default admin can do this)
export async function POST(request: Request) {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  // Strictly enforce: Only the default administrator can add/provision new admins!
  if (!auth.user.isDefaultAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only the primary default administrator can add or provision administrator accounts.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const validation = CreateAdminSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      )
    }

    const { name, email, password } = validation.data
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An admin account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          ...newUser,
          isDefaultAdmin: isDefaultAdmin(newUser.email),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create admin account:', error)
    return NextResponse.json({ error: 'Internal server error while creating admin' }, { status: 500 })
  }
}
