import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/dal'

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  return NextResponse.json({
    user: auth.user,
  })
}
