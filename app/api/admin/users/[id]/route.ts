import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession, isDefaultAdmin } from '@/lib/dal'

interface RouteContext {
  params: Promise<{ id: string }>
}

const UpdateAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
})

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const validation = UpdateAdminSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      )
    }

    const { name, password } = validation.data
    if (!name && !password) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 })
    }

    const targetAdmin = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 })
    }

    const targetIsDefaultAdmin = isDefaultAdmin(targetAdmin.email)
    const callerIsDefaultAdmin = auth.user.isDefaultAdmin

    if (targetIsDefaultAdmin && !callerIsDefaultAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only the primary default administrator can edit the default admin account.' },
        { status: 403 }
      )
    }

    if (!callerIsDefaultAdmin && auth.user.id !== targetAdmin.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit other administrator accounts.' },
        { status: 403 }
      )
    }

    const updateData: { name?: string; passwordHash?: string } = {}
    if (name) {
      updateData.name = name.trim()
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        ...updated,
        isDefaultAdmin: isDefaultAdmin(updated.email),
      },
    })
  } catch (error) {
    console.error('Failed to update admin account:', error)
    return NextResponse.json({ error: 'Internal server error while updating admin' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  if (!auth.user.isDefaultAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only the primary default administrator can remove administrator accounts.' },
      { status: 403 }
    )
  }

  try {
    const { id } = await context.params

    const targetAdmin = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 })
    }

    if (isDefaultAdmin(targetAdmin.email)) {
      return NextResponse.json(
        { error: 'Cannot remove the primary default administrator account.' },
        { status: 400 }
      )
    }

    if (auth.user.id === targetAdmin.id) {
      return NextResponse.json(
        { error: 'Cannot remove your own active administrator account.' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Admin account removed successfully' })
  } catch (error) {
    console.error('Failed to delete admin account:', error)
    return NextResponse.json({ error: 'Internal server error while deleting admin' }, { status: 500 })
  }
}
