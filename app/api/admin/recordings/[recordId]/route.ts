import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/dal'
import { deleteBBBRecording } from '@/lib/bbb'

interface RouteContext {
  params: Promise<{ recordId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    const { recordId } = await context.params
    const success = await deleteBBBRecording(recordId)

    if (success) {
      return NextResponse.json({ success: true, message: 'Recording deleted successfully' })
    } else {
      return NextResponse.json({ error: 'Failed to delete recording on BBB server' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to delete recording:', error)
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 })
  }
}
