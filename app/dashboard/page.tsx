'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Video,
  Users,
  Plus,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Shield,
  KeyRound,
  Calendar,
  AlertCircle,
  Sparkles,
  Server,
  UserCheck
} from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: string
}

interface Meeting {
  id: string
  name: string
  meetingId: string
  attendeePassword: string
  moderatorPassword: string
  welcomeMessage: string | null
  maxParticipants: number | null
  isRecorded: boolean
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'meetings' | 'admins'>('meetings')

  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showCreateMeeting, setShowCreateMeeting] = useState(false)
  const [meetingName, setMeetingName] = useState('')
  const [attendeePassword, setAttendeePassword] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isRecorded, setIsRecorded] = useState(false)
  const [meetingSubmitting, setMeetingSubmitting] = useState(false)
  const [meetingError, setMeetingError] = useState<string | null>(null)

  // Admins state
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      // 1. Verify user session
      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) {
        router.push('/login')
        return
      }
      const meData = await meRes.json()
      setCurrentUser(meData.user)

      // 2. Fetch meetings
      const meetingsRes = await fetch('/api/admin/meetings')
      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json()
        setMeetings(meetingsData.meetings || [])
      }

      // 3. Fetch admins
      const adminsRes = await fetch('/api/admin/users')
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json()
        setAdmins(adminsData.users || [])
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/login')
    }
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault()
    setMeetingError(null)
    setMeetingSubmitting(true)

    try {
      const res = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: meetingName,
          attendeePassword: attendeePassword || undefined,
          welcomeMessage: welcomeMessage || undefined,
          isRecorded,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMeetingError(data.error || 'Failed to create meeting')
        setMeetingSubmitting(false)
        return
      }

      setMeetings([data.meeting, ...meetings])
      setMeetingName('')
      setAttendeePassword('')
      setWelcomeMessage('')
      setIsRecorded(false)
      setShowCreateMeeting(false)
    } catch (err) {
      console.error('Create meeting error:', err)
      setMeetingError('An unexpected network error occurred')
    } finally {
      setMeetingSubmitting(false)
    }
  }

  async function handleDeleteMeeting(id: string) {
    if (!confirm('Are you sure you want to delete and end this meeting?')) return

    try {
      const res = await fetch(`/api/admin/meetings/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== id))
      } else {
        alert('Failed to delete meeting')
      }
    } catch (err) {
      console.error('Delete meeting error:', err)
    }
  }

  async function handleJoinAsModerator(meetingId: string) {
    try {
      const res = await fetch(`/api/admin/meetings/${meetingId}/join-moderator`)
      const data = await res.json()
      if (res.ok && data.joinUrl) {
        window.open(data.joinUrl, '_blank')
      } else {
        alert(data.error || 'Failed to generate moderator join link')
      }
    } catch (err) {
      console.error('Join moderator error:', err)
      alert('Network error')
    }
  }

  function copyParticipantLink(meetingId: string) {
    const origin = window.location.origin
    const url = `${origin}/join/${meetingId}`
    navigator.clipboard.writeText(url)
    setCopiedId(meetingId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError(null)
    setAdminSuccess(null)
    setAdminSubmitting(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setAdminError(data.error || 'Failed to create admin user')
        setAdminSubmitting(false)
        return
      }

      setAdminSuccess(`Admin account for ${data.user.email} created successfully.`)
      setAdmins([data.user, ...admins])
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      setTimeout(() => setShowCreateAdmin(false), 2000)
    } catch (err) {
      console.error('Create admin error:', err)
      setAdminError('Unexpected error creating admin')
    } finally {
      setAdminSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading PulseEdu Administrator Dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="PulseEdu Icon"
              width={34}
              height={34}
              className="rounded-lg shadow-sm"
            />
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo-wide.png"
                alt="PulseEdu"
                width={120}
                height={30}
                className="h-7 w-auto object-contain hidden xs:block"
                priority
              />
              <span className="text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-200">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-xs text-slate-400">
                {currentUser?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Navigation Tabs & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('meetings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeTab === 'meetings'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Meetings</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-indigo-900/40 text-indigo-200">
                {meetings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Admin Accounts</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-indigo-900/40 text-indigo-200">
                {admins.length}
              </span>
            </button>
          </div>

          <div>
            {activeTab === 'meetings' ? (
              <button
                onClick={() => setShowCreateMeeting(!showCreateMeeting)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Meeting</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCreateAdmin(!showCreateAdmin)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Admin Account</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MEETINGS */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            {/* Create Meeting Modal / Card */}
            {showCreateMeeting && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative animate-in fade-in">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Create BigBlueButton Meeting
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Admins can join as moderators with full presentation controls. External participants will receive a public link and join without needing a PulseEdu account.
                </p>

                {meetingError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{meetingError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateMeeting} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Meeting Name / Topic *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering Architecture Sync"
                      value={meetingName}
                      onChange={(e) => setMeetingName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Attendee Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave empty for auto-generated"
                      value={attendeePassword}
                      onChange={(e) => setAttendeePassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500">
                      Attendees use this (or join link) to enter.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Welcome Message (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Welcome to PulseEdu Live Session!"
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500">
                      Displayed in the BBB chat when joining.
                    </span>
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="recordMeeting"
                      checked={isRecorded}
                      onChange={(e) => setIsRecorded(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="recordMeeting" className="text-xs font-medium text-slate-300">
                      Enable session recording in BigBlueButton
                    </label>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateMeeting(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={meetingSubmitting}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      {meetingSubmitting ? 'Creating Meeting...' : 'Create Meeting'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Meetings List */}
            {meetings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
                  <Video className="w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-white">No active meetings</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Create a new meeting to launch a BigBlueButton room and invite participants with a direct link.
                </p>
                <button
                  onClick={() => setShowCreateMeeting(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Meeting</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">
                            {meeting.name}
                          </h4>
                          {meeting.isRecorded && (
                            <span className="text-[10px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full">
                              Recording Enabled
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                          <span className="font-mono text-slate-500">ID: {meeting.meetingId}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(meeting.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleJoinAsModerator(meeting.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-900/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Join as Moderator</span>
                        </button>

                        <button
                          onClick={() => copyParticipantLink(meeting.meetingId)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                        >
                          {copiedId === meeting.meetingId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Invite Link</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 transition cursor-pointer"
                          title="Delete & End Meeting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 rounded-lg p-3 text-xs border border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                          <span>Attendee Pass:</span>
                          <span className="font-mono text-slate-200 font-medium">
                            {meeting.attendeePassword || 'None (Open)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-slate-500" />
                          <span>Moderator Pass:</span>
                          <span className="font-mono text-slate-200 font-medium">
                            {meeting.moderatorPassword}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-indigo-400">
                        Participant Link: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">/join/{meeting.meetingId}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADMIN ACCOUNTS */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            {/* Architecture Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Single Account Type: Administrator
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    PulseEdu uses a single account architecture. There are no student, teacher, or moderator roles inside the application. Every user account possesses complete administrative privileges to manage meetings, server settings, and provision additional admin accounts.
                  </p>
                </div>
              </div>
            </div>

            {/* Create Admin Form */}
            {showCreateAdmin && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl animate-in fade-in">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Provision Additional Admin Account
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Only authenticated administrators can provision new administrator accounts. Visitors cannot self-register.
                </p>

                {adminError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {adminSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{adminSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="newadmin@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 8 characters"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateAdmin(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adminSubmitting}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      {adminSubmitting ? 'Creating Admin...' : 'Create Admin Account'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin Accounts Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Active Administrators ({admins.length})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-5">Administrator</th>
                      <th className="py-3 px-5">Email</th>
                      <th className="py-3 px-5">Account Type</th>
                      <th className="py-3 px-5">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-5 font-semibold text-white flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{admin.name}</span>
                          {admin.id === currentUser?.id && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-slate-300 font-mono">
                          {admin.email}
                        </td>
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-400">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CLI Provisioning Documentation */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Command-Line Admin Provisioning Script</span>
              </div>
              <p>
                Admins can also be provisioned securely via terminal or automated CI/CD pipeline using the setup script:
              </p>
              <pre className="bg-slate-950 p-3 rounded-lg text-slate-300 font-mono overflow-x-auto text-[11px] border border-slate-800/80">
npm run create-admin -- --email=admin2@pulseedu.com --password=SecurePassword123! --name="Secondary Admin"
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
