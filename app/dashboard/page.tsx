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
  Menu,
  X,
  Film,
  Play,
  Clock,
  RefreshCw,
  AlertTriangle,
  Loader2
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

interface Recording {
  recordId: string
  meetingId: string
  name: string
  published: boolean
  startTime: number
  endTime: number
  playbackUrl?: string
  lengthMinutes?: number
}

interface ConfirmModalState {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  onConfirm: () => Promise<void> | void
}

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'meetings' | 'recordings' | 'admins'>('meetings')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showCreateMeeting, setShowCreateMeeting] = useState(false)
  const [meetingName, setMeetingName] = useState('')
  const [attendeePassword, setAttendeePassword] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isRecorded, setIsRecorded] = useState(false)
  const [meetingSubmitting, setMeetingSubmitting] = useState(false)
  const [meetingError, setMeetingError] = useState<string | null>(null)

  // Recordings state
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)

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

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [confirmLoading, setConfirmLoading] = useState(false)

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

      // 3. Fetch recordings
      fetchRecordings()

      // 4. Fetch admins
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

  async function fetchRecordings() {
    setRecordingsLoading(true)
    try {
      const res = await fetch('/api/admin/recordings')
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.recordings || [])
      }
    } catch (err) {
      console.error('Failed to load recordings:', err)
    } finally {
      setRecordingsLoading(false)
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

  function promptDeleteMeeting(meeting: Meeting) {
    setConfirmModal({
      isOpen: true,
      title: 'End & Delete Meeting',
      message: `Are you sure you want to delete "${meeting.name}"? This will terminate any active BigBlueButton session and remove its join link.`,
      confirmText: 'Delete Meeting',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch(`/api/admin/meetings/${meeting.id}`, {
            method: 'DELETE',
          })
          if (res.ok) {
            setMeetings((prev) => prev.filter((m) => m.id !== meeting.id))
          } else {
            alert('Failed to delete meeting')
          }
        } catch (err) {
          console.error('Delete meeting error:', err)
        } finally {
          setConfirmLoading(false)
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  function promptDeleteRecording(recording: Recording) {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Recording',
      message: `Are you sure you want to permanently delete the recording for "${recording.name}"? This action cannot be undone.`,
      confirmText: 'Delete Recording',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch(`/api/admin/recordings/${recording.recordId}`, {
            method: 'DELETE',
          })
          if (res.ok) {
            setRecordings((prev) => prev.filter((r) => r.recordId !== recording.recordId))
          } else {
            alert('Failed to delete recording from server')
          }
        } catch (err) {
          console.error('Delete recording error:', err)
        } finally {
          setConfirmLoading(false)
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
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

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
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
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => confirmModal.onConfirm()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-900/30"
              >
                {confirmLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmModal.confirmText || 'Confirm'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* LEFT SIDE PANEL (SIDEBAR) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar Brand Header */}
          <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/icon.png"
                alt="PulseEdu"
                width={32}
                height={32}
                className="rounded-lg shadow-sm"
              />
              <div className="flex flex-col">
                <Image
                  src="/logo-wide.png"
                  alt="PulseEdu"
                  width={110}
                  height={26}
                  className="h-6 w-auto object-contain"
                  priority
                />
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">
                  Admin Portal
                </span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Nav Items */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-2">
              Management
            </div>

            {/* Meetings Tab */}
            <button
              onClick={() => {
                setActiveTab('meetings')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'meetings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4" />
                <span>Meetings</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  activeTab === 'meetings'
                    ? 'bg-indigo-500/30 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {meetings.length}
              </span>
            </button>

            {/* Recordings Tab */}
            <button
              onClick={() => {
                setActiveTab('recordings')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'recordings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Film className="w-4 h-4" />
                <span>Recordings</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  activeTab === 'recordings'
                    ? 'bg-indigo-500/30 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {recordings.length}
              </span>
            </button>

            {/* Admin Accounts Tab */}
            <button
              onClick={() => {
                setActiveTab('admins')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Admin Accounts</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  activeTab === 'admins'
                    ? 'bg-indigo-500/30 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {admins.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30 flex-shrink-0">
              {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-[11px] text-slate-400 truncate font-mono">
                {currentUser?.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-900/50 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main Header Bar */}
        <header className="h-16 bg-slate-900/80 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {activeTab === 'meetings' && (
                  <>
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span>Meetings Management</span>
                  </>
                )}
                {activeTab === 'recordings' && (
                  <>
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span>Session Recordings</span>
                  </>
                )}
                {activeTab === 'admins' && (
                  <>
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Administrator Accounts</span>
                  </>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {activeTab === 'meetings' && 'Create, launch, and manage live BigBlueButton sessions'}
                {activeTab === 'recordings' && 'View, playback, and manage recorded meeting sessions'}
                {activeTab === 'admins' && 'Provision and manage platform administrators'}
              </p>
            </div>
          </div>

          <div>
            {activeTab === 'meetings' && (
              <button
                onClick={() => setShowCreateMeeting(!showCreateMeeting)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Meeting</span>
              </button>
            )}

            {activeTab === 'recordings' && (
              <button
                onClick={fetchRecordings}
                disabled={recordingsLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recordingsLoading ? 'animate-spin text-indigo-400' : ''}`} />
                <span>Refresh Recordings</span>
              </button>
            )}

            {activeTab === 'admins' && (
              <button
                onClick={() => setShowCreateAdmin(!showCreateAdmin)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Admin Account</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* TAB 1: MEETINGS */}
            {activeTab === 'meetings' && (
              <div className="space-y-6">
                {/* Create Meeting Modal / Card */}
                {showCreateMeeting && (
                  <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative animate-in fade-in">
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Create BigBlueButton Meeting
                    </h3>
                    <p className="text-xs text-slate-400 mb-6">
                      Admins join as host with full presentation controls. External participants receive a link and join as guests.
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
                          Guests use this to enter.
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
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
                      <Video className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-white">No active meetings</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Create a new meeting to launch a BigBlueButton room and invite participants with a direct link.
                    </p>
                    <button
                      onClick={() => setShowCreateMeeting(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer"
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
                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4 shadow-sm"
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
                              <span>Join as Host</span>
                            </button>

                            <button
                              onClick={() => {
                                const origin = window.location.origin
                                copyText(`${origin}/join/${meeting.meetingId}`, meeting.meetingId)
                              }}
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
                              onClick={() => promptDeleteMeeting(meeting)}
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
                              <span>Guest Password:</span>
                              <span className="font-mono text-slate-200 font-medium">
                                {meeting.attendeePassword || 'None (Open)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-slate-500" />
                              <span>Host Password:</span>
                              <span className="font-mono text-slate-200 font-medium">
                                {meeting.moderatorPassword}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-indigo-400">
                            Public Join Link: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">/join/{meeting.meetingId}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RECORDINGS */}
            {activeTab === 'recordings' && (
              <div className="space-y-6">
                {recordings.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
                      <Film className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-white">No recordings found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Recordings will appear here after BigBlueButton meetings with recording enabled have ended and processed.
                    </p>
                    <button
                      onClick={fetchRecordings}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Check for New Recordings</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {recordings.map((rec) => (
                      <div
                        key={rec.recordId}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-white">
                                {rec.name}
                              </h4>
                              <span className="text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full">
                                Processed
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                              <span className="font-mono text-slate-500">ID: {rec.recordId}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(rec.startTime).toLocaleDateString()}
                              </span>
                              {rec.lengthMinutes !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {rec.lengthMinutes} mins
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {rec.playbackUrl ? (
                              <>
                                <a
                                  href={rec.playbackUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-indigo-900/20"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Watch Playback</span>
                                </a>

                                <button
                                  onClick={() => copyText(rec.playbackUrl!, rec.recordId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                >
                                  {copiedId === rec.recordId ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Playback Link</span>
                                    </>
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Processing playback...</span>
                            )}

                            <button
                              onClick={() => promptDeleteRecording(rec)}
                              className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 transition cursor-pointer"
                              title="Delete Recording"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ADMIN ACCOUNTS */}
            {activeTab === 'admins' && (
              <div className="space-y-6">
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
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
