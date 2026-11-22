'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Video, Shield, User, KeyRound, AlertCircle, ArrowRight, Loader2, Info } from 'lucide-react'

interface PublicMeetingInfo {
  name: string
  meetingId: string
  welcomeMessage: string | null
  isRecorded: boolean
  hasPassword: boolean
}

export default function JoinMeetingPage() {
  const params = useParams()
  const meetingId = params.meetingId as string

  const [meeting, setMeeting] = useState<PublicMeetingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMeetingInfo() {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/public-info`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Meeting not found or link has expired.')
          setLoading(false)
          return
        }

        setMeeting(data)
      } catch (err) {
        console.error('Failed to load meeting:', err)
        setError('Network error while connecting to meeting.')
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

    if (!displayName.trim()) {
      setJoinError('Please enter your display name')
      return
    }

    setJoining(true)

    try {
      const res = await fetch(`/api/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          password: password || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setJoinError(data.error || 'Failed to enter meeting room')
        setJoining(false)
        return
      }

      if (data.joinUrl) {
        // Redirect participant directly to BigBlueButton meeting room
        window.location.href = data.joinUrl
      } else {
        setJoinError('Invalid response from meeting server')
        setJoining(false)
      }
    } catch (err) {
      console.error('Join error:', err)
      setJoinError('Connection error while joining meeting')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium">Connecting to PulseEdu BigBlueButton Session...</span>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Meeting Unavailable</h2>
          <p className="text-xs text-slate-400">
            {error || 'This meeting link is invalid or the session has ended.'}
          </p>
          <div className="pt-2">
            <a
              href="/login"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Are you an administrator? Sign in here.
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Image
            src="/logo-wide.png"
            alt="PulseEdu"
            width={200}
            height={50}
            className="h-10 w-auto object-contain drop-shadow"
            priority
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Join BigBlueButton Session
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          PulseEdu Live Virtual Classroom
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          {/* Meeting Details Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Session Topic:</span>
              <span className="font-bold text-white text-sm">{meeting.name}</span>
            </div>
            {meeting.welcomeMessage && (
              <div className="text-slate-400 pt-1 border-t border-slate-800/80 italic">
                "{meeting.welcomeMessage}"
              </div>
            )}
            {meeting.isRecorded && (
              <div className="text-[11px] text-amber-400/90 pt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Notice: This session may be recorded by the moderator.</span>
              </div>
            )}
          </div>

          {/* Guest Notice */}
          <div className="flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-xs text-indigo-300">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Guest Participant:</strong> No PulseEdu account or registration required. Simply enter your display name to join.
            </span>
          </div>

          {joinError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
              >
                Your Display Name *
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {meeting.hasPassword && (
              <div>
                <label
                  htmlFor="meetingPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  Meeting Password (If Required)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="meetingPassword"
                    type="password"
                    placeholder="Enter attendee password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={joining}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition cursor-pointer"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching BigBlueButton...</span>
                </>
              ) : (
                <>
                  <span>Join Meeting Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
            Powered by BigBlueButton™ and PulseEdu
          </div>
        </div>
      </div>
    </div>
  )
}
