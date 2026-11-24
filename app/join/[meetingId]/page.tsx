'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  User,
  KeyRound,
  Shield,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  LayoutDashboard,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'

interface PublicMeetingInfo {
  name: string
  meetingId: string
  welcomeMessage: string | null
  isRecorded: boolean
  isEnded: boolean
  endedAt: string | null
  hasPassword: boolean
  isAuthenticated: boolean
  adminUser: {
    name: string
    email: string
  } | null
}

export default function JoinMeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.meetingId as string

  const [meeting, setMeeting] = useState<PublicMeetingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showMeetingPassword, setShowMeetingPassword] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMeetingInfo() {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/public-info`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load meeting details')
          setLoading(false)
          return
        }

        setMeeting(data)

        if (data.isAuthenticated && data.adminUser?.name) {
          setDisplayName(data.adminUser.name)
        }
      } catch (err) {
        console.error('Fetch meeting info error:', err)
        setError('Network error loading meeting details')
      } finally {
        setLoading(false)
      }
    }

    if (meetingId) {
      fetchMeetingInfo()
    }
  }, [meetingId])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinError(null)
    setJoining(true)

    try {
      const res = await fetch(`/api/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          password: password || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setJoinError(data.error || 'Unable to join meeting session')
        setJoining(false)
        return
      }

      if (data.joinUrl) {
        window.location.href = data.joinUrl
      } else {
        setJoinError('Join URL was not returned by the server.')
        setJoining(false)
      }
    } catch (err) {
      console.error('Join error:', err)
      setJoinError('A network error occurred while connecting to BigBlueButton.')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium">Preparing meeting room...</span>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Meeting Unavailable</h2>
          <p className="text-xs text-slate-600">
            {error || 'This meeting link is invalid or the session has ended.'}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-xs text-indigo-600 hover:text-indigo-500 underline font-medium"
            >
              Sign in as an administrator
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (meeting.isEnded) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="flex justify-center mb-2">
            <Image
              src="/logo-wide.png"
              alt="PulseEdu"
              width={180}
              height={45}
              className="h-9 w-auto object-contain drop-shadow-sm"
              priority
            />
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 text-slate-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">This Meeting Has Ended</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            The host has concluded <strong className="text-slate-800">{meeting.name}</strong>. This session is closed and no further participants can join.
          </p>
          {meeting.isAuthenticated && (
            <div className="pt-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Return to Admin Dashboard</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  const isHost = meeting.isAuthenticated

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Image
            src="/logo-wide.png"
            alt="PulseEdu"
            width={200}
            height={50}
            className="h-10 w-auto object-contain drop-shadow-sm"
            priority
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Join BigBlueButton Session
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          PulseEdu Live Virtual Classroom
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl rounded-2xl sm:px-10 space-y-6">

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Session Topic:</span>
              <span className="font-bold text-slate-900 text-sm">{meeting.name}</span>
            </div>
            {meeting.welcomeMessage && (
              <div className="text-slate-600 pt-1 border-t border-slate-200 italic">
                "{meeting.welcomeMessage}"
              </div>
            )}
            {meeting.isRecorded && (
              <div className="text-[11px] text-amber-700 pt-1 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Notice: This session may be recorded by the host.</span>
              </div>
            )}
          </div>

          {isHost ? (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <Shield className="w-4 h-4" />
                  Authenticated as Host
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Moderator Privileges
                </span>
              </div>
              <p className="text-emerald-900 text-[11px] leading-relaxed">
                Signed in as <strong className="font-semibold">{meeting.adminUser?.name}</strong> ({meeting.adminUser?.email}). You will join with full host and moderator controls.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <span>Joining as: <strong className="text-slate-800">Guest Participant</strong></span>
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-500 underline font-medium text-[11px]"
              >
                Host login
              </Link>
            </div>
          )}

          {joinError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                {isHost ? 'Host Display Name *' : 'Your Display Name *'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  required
                  placeholder={isHost ? 'Host Name' : 'Enter your name'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition"
                />
              </div>
            </div>

            {!isHost && meeting.hasPassword && (
              <div>
                <label
                  htmlFor="meetingPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Meeting Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="meetingPassword"
                    type={showMeetingPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter attendee password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMeetingPassword(!showMeetingPassword)}
                    aria-label={showMeetingPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                  >
                    {showMeetingPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={joining}
              className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition cursor-pointer ${
                isHost
                  ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500 shadow-md shadow-indigo-600/20'
              }`}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching BigBlueButton...</span>
                </>
              ) : (
                <>
                  {isHost ? (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>Join Meeting as Host</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Join Meeting as Guest</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {isHost && (
            <div className="pt-2 text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Return to Admin Dashboard</span>
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
            Powered by BigBlueButton™ and PulseEdu
          </div>
        </div>
      </div>
    </div>
  )
}
