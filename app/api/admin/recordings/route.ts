import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/dal'
import { getBBBRecordings } from '@/lib/bbb'

// GET /api/admin/recordings - List all recordings from BigBlueButton
export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const recordings = await getBBBRecordings()
    return NextResponse.json({ recordings })
  } catch (error) {
    console.error('Failed to get recordings:', error)
    return NextResponse.json({ error: 'Failed to retrieve recordings' }, { status: 500 })
  }
}
