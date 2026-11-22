'use client'

import React, { useState, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Mail, ShieldAlert, ArrowRight, Video, CheckCircle2, Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to authenticate')
        setLoading(false)
        return
      }

      router.push(from)
      router.refresh()
    } catch (err) {
      console.error('Login request failed:', err)
      setError('A connection error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
      {error && (
        <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
          >
            Admin Email
          </label>
          <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pulseedu.online"
              className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
          >
            Password
          </label>
          <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In as Admin</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 space-y-3">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Admin-Only Application:</strong> PulseEdu has no public registration. Every authenticated account is an Administrator.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Video className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Meeting Participants:</strong> People invited to BigBlueButton sessions do not need an account and can join directly through their meeting link.
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo-wide.png"
            alt="PulseEdu"
            width={240}
            height={60}
            priority
            className="h-12 w-auto object-contain drop-shadow"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Administrator Authentication Portal
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          PulseEdu Live Virtual Classroom Administration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span>Loading authentication portal...</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
