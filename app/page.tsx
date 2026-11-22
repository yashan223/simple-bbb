import { redirect } from 'next/navigation'
import { verifyAdminSession } from '@/lib/dal'

export default async function HomePage() {
  const auth = await verifyAdminSession()

  if (auth?.isAuth) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
