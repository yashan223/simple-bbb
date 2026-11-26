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
  Menu,
  X,
  Film,
  Play,
  Clock,
  RefreshCw,
  AlertTriangle,
  Loader2,
  PowerOff,
  Edit3,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Search
} from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: string
  isDefaultAdmin?: boolean
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
  hasStarted?: boolean
  isEnded: boolean
  endedAt: string | null
  createdAt: string
}

interface Recording {
  recordId: string
  meetingId: string
  name: string
  published: boolean
  state?: string
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
  const [activeTab, setActiveTab] = useState<'meetings' | 'concluded' | 'recordings' | 'users'>('meetings')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showCreateMeeting, setShowCreateMeeting] = useState(false)
  const [meetingName, setMeetingName] = useState('')
  const [attendeePassword, setAttendeePassword] = useState('')
  const [showAttendeePassword, setShowAttendeePassword] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isRecorded, setIsRecorded] = useState(true)
  const [meetingSubmitting, setMeetingSubmitting] = useState(false)
  const [meetingError, setMeetingError] = useState<string | null>(null)

  const activeMeetings = meetings.filter((m) => !m.isEnded)
  const endedMeetings = meetings.filter((m) => m.isEnded)

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false)
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [editAdminName, setEditAdminName] = useState('')
  const [editAdminPassword, setEditAdminPassword] = useState('')
  const [showEditAdminPassword, setShowEditAdminPassword] = useState(false)
  const [editAdminSubmitting, setEditAdminSubmitting] = useState(false)
  const [editAdminError, setEditAdminError] = useState<string | null>(null)
  const [editAdminSuccess, setEditAdminSuccess] = useState<string | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchInitialData()
    const interval = setInterval(() => {
      syncMeetings()
      fetchRecordings(false)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  async function syncMeetings() {
    try {
      const meetingsRes = await fetch('/api/admin/meetings')
      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json()
        setMeetings(meetingsData.meetings || [])
      }
    } catch (err) {
      console.error('Failed to sync meetings:', err)
    }
  }

  async function fetchInitialData() {
    setLoading(true)
    try {

      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) {
        router.push('/login')
        return
      }
      const meData = await meRes.json()
      setCurrentUser(meData.user)

      const meetingsRes = await fetch('/api/admin/meetings')
      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json()
        setMeetings(meetingsData.meetings || [])
      }

      fetchRecordings()

      if (meData.user?.isDefaultAdmin) {
        const adminsRes = await fetch('/api/admin/users')
        if (adminsRes.ok) {
          const adminsData = await adminsRes.json()
          setAdmins(adminsData.users || [])
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecordings(showSpinner?: boolean | unknown) {
    const shouldSpin = typeof showSpinner === 'boolean' ? showSpinner : true
    if (shouldSpin) setRecordingsLoading(true)
    try {
      const res = await fetch('/api/admin/recordings')
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.recordings || [])
      }
    } catch (err) {
      console.error('Failed to load recordings:', err)
    } finally {
      if (shouldSpin) setRecordingsLoading(false)
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
      setIsRecorded(true)
      setShowCreateMeeting(false)
    } catch (err) {
      console.error('Create meeting error:', err)
      setMeetingError('An unexpected network error occurred')
    } finally {
      setMeetingSubmitting(false)
    }
  }

  function promptEndMeeting(meeting: Meeting) {
    setConfirmModal({
      isOpen: true,
      title: 'End Live Meeting for Everyone',
      message: `Are you sure you want to end "${meeting.name}"? All attendees will be disconnected immediately and the meeting will be closed permanently. No one will be able to rejoin.`,
      confirmText: 'End Meeting',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch(`/api/admin/meetings/${meeting.id}/end`, {
            method: 'POST',
          })
          const data = await res.json()
          if (res.ok) {
            setMeetings((prev) =>
              prev.map((m) => (m.id === meeting.id ? { ...m, isEnded: true } : m))
            )
          } else {
            alert(data.error || 'Failed to end meeting')
          }
        } catch (err) {
          console.error('End meeting error:', err)
        } finally {
          setConfirmLoading(false)
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  function promptDeleteMeeting(meeting: Meeting) {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Meeting Record',
      message: `Are you sure you want to permanently delete "${meeting.name}" from your meetings list?`,
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

      setAdminSuccess(`User account for ${data.user.email} created successfully.`)
      setAdmins([data.user, ...admins])
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      setShowNewAdminPassword(false)
      setTimeout(() => setShowCreateAdmin(false), 2000)
    } catch (err) {
      console.error('Create admin error:', err)
      setAdminError('Unexpected error creating admin')
    } finally {
      setAdminSubmitting(false)
    }
  }

  function openEditAdmin(admin: AdminUser) {
    setEditingAdmin(admin)
    setEditAdminName(admin.name)
    setEditAdminPassword('')
    setShowEditAdminPassword(false)
    setEditAdminError(null)
    setEditAdminSuccess(null)
  }

  async function handleUpdateAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAdmin) return

    setEditAdminSubmitting(true)
    setEditAdminError(null)
    setEditAdminSuccess(null)

    try {
      const payload: { name: string; password?: string } = {
        name: editAdminName.trim(),
      }
      if (editAdminPassword.trim()) {
        payload.password = editAdminPassword.trim()
      }

      const res = await fetch(`/api/admin/users/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setEditAdminError(data.error || 'Failed to update administrator')
        return
      }

      setEditAdminSuccess('Administrator updated successfully')

      setAdmins((prev) =>
        prev.map((a) => (a.id === editingAdmin.id ? { ...a, name: editAdminName.trim() } : a))
      )

      if (currentUser?.id === editingAdmin.id) {
        setCurrentUser((prev) => (prev ? { ...prev, name: editAdminName.trim() } : null))
      }

      setTimeout(() => {
        setEditingAdmin(null)
        setEditAdminSuccess(null)
      }, 1000)
    } catch (err) {
      console.error('Error updating admin:', err)
      setEditAdminError('Network error while updating administrator')
    } finally {
      setEditAdminSubmitting(false)
    }
  }

  function promptDeleteAdmin(admin: AdminUser) {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Administrator',
      message: `Are you sure you want to remove ${admin.name} (${admin.email})? They will immediately lose access to PulseEdu.`,
      confirmText: 'Remove Admin',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch(`/api/admin/users/${admin.id}`, {
            method: 'DELETE',
          })
          const data = await res.json()
          if (res.ok) {
            setAdmins((prev) => prev.filter((a) => a.id !== admin.id))
          } else {
            alert(data.error || 'Failed to remove admin')
          }
        } catch (err) {
          console.error('Failed to remove admin:', err)
        } finally {
          setConfirmLoading(false)
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading PulseEdu Administrator Dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => confirmModal.onConfirm()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md shadow-rose-600/20"
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

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">

          <div className="h-20 px-4 border-b border-slate-200 flex items-center justify-center relative">
            <div className="flex items-center justify-center py-2">
              <Image
                src="/logo-wide.png"
                alt="PulseEdu"
                width={220}
                height={60}
                className="h-11 md:h-12 w-auto object-contain drop-shadow-sm"
                priority
              />
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 pb-2">
              Management
            </div>

            <button
              onClick={() => {
                setActiveTab('meetings')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'meetings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {activeMeetings.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('concluded')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'concluded'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>Concluded Sessions</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  activeTab === 'concluded'
                    ? 'bg-indigo-500/30 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {endedMeetings.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('recordings')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'recordings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {recordings.length}
              </span>
            </button>

            {currentUser?.isDefaultAdmin && (
              <button
                onClick={() => {
                  setActiveTab('users')
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>User Management</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    activeTab === 'users'
                      ? 'bg-indigo-500/30 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {admins.length}
                </span>
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm border border-indigo-200 flex-shrink-0">
              {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                <span>{currentUser?.name || 'Administrator'}</span>
                {currentUser?.isDefaultAdmin && (
                  <span title="Primary Default Administrator">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono">
                {currentUser?.email}
              </div>
            </div>
            {currentUser && (
              <button
                onClick={() => openEditAdmin(currentUser)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                title="Edit Your Account"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">

        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xs shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 md:hidden transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {activeTab === 'meetings' && (
                  <>
                    <Video className="w-4 h-4 text-indigo-600" />
                    <span>Meetings Management</span>
                  </>
                )}
                {activeTab === 'concluded' && (
                  <>
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Concluded Sessions</span>
                  </>
                )}
                {activeTab === 'recordings' && (
                  <>
                    <Film className="w-4 h-4 text-indigo-600" />
                    <span>Session Recordings</span>
                  </>
                )}
                {activeTab === 'users' && (
                  <>
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>User Management</span>
                  </>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {activeTab === 'meetings' && 'Create, launch, manage, and end BigBlueButton sessions'}
                {activeTab === 'concluded' && 'View and manage previously ended BigBlueButton sessions'}
                {activeTab === 'recordings' && 'View, playback, and manage recorded meeting sessions'}
                {activeTab === 'users' && 'Provision, view, update, and manage system users and administrator accounts'}
              </p>
            </div>
          </div>

          <div>
            {activeTab === 'meetings' && (
              <button
                onClick={() => setShowCreateMeeting(!showCreateMeeting)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Meeting</span>
              </button>
            )}

            {activeTab === 'recordings' && (
              <button
                onClick={fetchRecordings}
                disabled={recordingsLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recordingsLoading ? 'animate-spin text-indigo-600' : ''}`} />
                <span>Refresh Recordings</span>
              </button>
            )}

            {activeTab === 'users' && currentUser?.isDefaultAdmin && (
              <button
                onClick={() => setShowCreateAdmin(!showCreateAdmin)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New User</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-slate-50">
          <div className="max-w-6xl mx-auto space-y-6">

            {activeTab === 'meetings' && (
              <div className="space-y-6">

                {showCreateMeeting && (
                  <div className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-md relative animate-in fade-in">
                    <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      Create BigBlueButton Meeting
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                      Admins join as host with full presentation controls. External participants receive a link and join as guests.
                    </p>

                    {meetingError && (
                      <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                        <span>{meetingError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateMeeting} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Meeting Name / Topic *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Meeting name"
                          value={meetingName}
                          onChange={(e) => setMeetingName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Attendee Password (Optional)
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <input
                            type={showAttendeePassword ? 'text' : 'password'}
                            placeholder="Attendee password (optional)"
                            value={attendeePassword}
                            onChange={(e) => setAttendeePassword(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                          />
                          {attendeePassword && (
                            <button
                              type="button"
                              onClick={() => setShowAttendeePassword(!showAttendeePassword)}
                              aria-label={showAttendeePassword ? 'Hide password' : 'Show password'}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                            >
                              {showAttendeePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Guests use this to enter.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Welcome Message (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Welcome message (optional)"
                          value={welcomeMessage}
                          onChange={(e) => setWelcomeMessage(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
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
                          className="h-4 w-4 rounded border-slate-300 bg-slate-50 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="recordMeeting" className="text-xs font-medium text-slate-700">
                          Enable session recording in BigBlueButton
                        </label>
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowCreateMeeting(false)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={meetingSubmitting}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-600/20"
                        >
                          {meetingSubmitting ? 'Creating Meeting...' : 'Create Meeting'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeMeetings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                      <Video className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">No active meetings</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Create a new meeting to launch a BigBlueButton room and invite participants with a direct link.
                    </p>
                    <button
                      onClick={() => setShowCreateMeeting(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer shadow-sm shadow-indigo-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Meeting</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {activeMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition space-y-4 shadow-sm hover:shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-900">
                                {meeting.name}
                              </h4>
                              <span className="text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Room
                              </span>
                              {meeting.isRecorded && (
                                <span className="text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full">
                                  Recording Enabled
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                              <span className="font-mono text-slate-400">ID: {meeting.meetingId}</span>
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
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-600/20"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Join as Host</span>
                            </button>

                            <button
                              onClick={() => {
                                const origin = window.location.origin
                                copyText(`${origin}/join/${meeting.meetingId}`, meeting.meetingId)
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-xs"
                            >
                              {copiedId === meeting.meetingId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Invite Link</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => promptEndMeeting(meeting)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-700 text-xs font-semibold border border-amber-200 hover:border-rose-200 transition cursor-pointer"
                              title="End live meeting for everyone"
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                              <span>End Meeting</span>
                            </button>

                            <button
                              onClick={() => promptDeleteMeeting(meeting)}
                              className="p-2 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-xs"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-4 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                              <span>Guest Password:</span>
                              <span className="font-mono text-slate-900 font-semibold">
                                {meeting.attendeePassword || 'None (Open)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                              <span>Host Password:</span>
                              <span className="font-mono text-slate-900 font-semibold">
                                {meeting.moderatorPassword}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {activeTab === 'concluded' && (
              <div className="space-y-4">
                {endedMeetings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-4">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">No concluded sessions</h4>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      Ended BigBlueButton sessions will appear here for your records.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {endedMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-85 hover:opacity-100 transition shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-700">
                              {meeting.name}
                            </h4>
                            <span className="text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                              Session Ended
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                            <span className="font-mono">ID: {meeting.meetingId}</span>
                            <span>•</span>
                            <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                            {meeting.endedAt && (
                              <>
                                <span>•</span>
                                <span className="text-rose-500 font-medium">
                                  Closed {new Date(meeting.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 italic">Room Closed</span>
                          <button
                            onClick={() => promptDeleteMeeting(meeting)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-xs"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recordings' && (
              <div className="space-y-6">
                {recordings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                      <Film className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">No recordings found</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Recordings will appear here after BigBlueButton meetings with recording enabled have ended and processed.
                    </p>
                    <button
                      onClick={fetchRecordings}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer shadow-sm shadow-indigo-600/20"
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
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition space-y-4 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-900">
                                {rec.name}
                              </h4>
                              {rec.playbackUrl ? (
                                <span className="text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">
                                  Processed
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                                  Processing
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                              <span className="font-mono text-slate-400">ID: {rec.recordId}</span>
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
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-indigo-600/20"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Watch Playback</span>
                                </a>

                                <button
                                  onClick={() => copyText(rec.playbackUrl!, rec.recordId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-xs"
                                >
                                  {copiedId === rec.recordId ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-600">Copied!</span>
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
                              <span className="text-xs text-slate-400 italic">Processing playback...</span>
                            )}

                            <button
                              onClick={() => promptDeleteRecording(rec)}
                              className="p-2 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-xs"
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

            {activeTab === 'users' && (
              <div className="space-y-6">

                {!currentUser?.isDefaultAdmin ? (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-4">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-amber-950">Access Restricted</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        User Management is exclusively available to the primary default administrator (<strong className="font-semibold text-amber-950">admin@pulseedu.online</strong>). Only the default administrator can provision, modify, or delete user accounts.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {showCreateAdmin && (
                      <div className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-md animate-in fade-in">
                        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                          Provision New User / Administrator Account
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">
                          Fill in the details below to provision a new user account with administrative privileges.
                        </p>

                        {adminError && (
                          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                            <span>{adminError}</span>
                          </div>
                        )}

                        {adminSuccess && (
                          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                            <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                            <span>{adminSuccess}</span>
                          </div>
                        )}

                        <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Doe"
                              value={newAdminName}
                              onChange={(e) => setNewAdminName(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. user@pulseedu.online"
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                              Initial Password *
                            </label>
                            <div className="relative rounded-lg shadow-sm">
                              <input
                                type={showNewAdminPassword ? 'text' : 'password'}
                                required
                                placeholder="Min 8 characters"
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                                aria-label={showNewAdminPassword ? 'Hide password' : 'Show password'}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                              >
                                {showNewAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="sm:col-span-3 flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => setShowCreateAdmin(false)}
                              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={adminSubmitting}
                              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-600/20"
                            >
                              {adminSubmitting ? 'Creating User...' : 'Create User Account'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Platform Users ({admins.length})
                          </h4>
                        </div>
                        <div className="relative w-full sm:w-72">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto -mx-5 -mb-5">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-5">User Account</th>
                              <th className="py-3 px-5">Email Address</th>
                              <th className="py-3 px-5">Role / Access</th>
                              <th className="py-3 px-5">Created Date</th>
                              <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {admins
                              .filter((admin) => {
                                if (!userSearchQuery.trim()) return true
                                const q = userSearchQuery.toLowerCase()
                                return (
                                  admin.name.toLowerCase().includes(q) ||
                                  admin.email.toLowerCase().includes(q)
                                )
                              })
                              .map((admin) => (
                                <tr key={admin.id} className="hover:bg-slate-50/80 transition">
                                  <td className="py-3 px-5 font-semibold text-slate-900 flex items-center gap-2.5">
                                    <div
                                      className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${
                                        admin.isDefaultAdmin
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      }`}
                                    >
                                      {admin.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{admin.name}</span>
                                    {admin.id === currentUser?.id && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                                        You
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-5 text-slate-600 font-mono">
                                    {admin.email}
                                  </td>
                                  <td className="py-3 px-5">
                                    {admin.isDefaultAdmin ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full">
                                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                                        Default Admin
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-full">
                                        <Shield className="w-3 h-3 text-indigo-600" />
                                        Administrator
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-5 text-slate-500">
                                    {new Date(admin.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => openEditAdmin(admin)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition cursor-pointer shadow-xs"
                                        title={admin.isDefaultAdmin ? 'Edit Default Admin' : 'Edit User'}
                                      >
                                        <Edit3 className={`w-3 h-3 ${admin.isDefaultAdmin ? 'text-amber-600' : 'text-indigo-600'}`} />
                                        <span>Edit</span>
                                      </button>
                                      {!admin.isDefaultAdmin && admin.id !== currentUser?.id && (
                                        <button
                                          onClick={() => promptDeleteAdmin(admin)}
                                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-xs"
                                          title="Remove User"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            {admins.filter((admin) => {
                              if (!userSearchQuery.trim()) return true
                              const q = userSearchQuery.toLowerCase()
                              return (
                                admin.name.toLowerCase().includes(q) ||
                                admin.email.toLowerCase().includes(q)
                              )
                            }).length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">
                                  No user accounts found matching "{userSearchQuery}".
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                {editingAdmin.isDefaultAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                ) : (
                  <Shield className="w-4 h-4 text-indigo-600" />
                )}
                <span>
                  {editingAdmin.id === currentUser?.id ? 'Edit Your Account' : 'Edit Administrator'}
                </span>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>
                Account Email: <strong className="text-slate-900 font-mono">{editingAdmin.email}</strong>
              </div>
              {editingAdmin.isDefaultAdmin && (
                <div className="text-amber-700 text-[11px] flex items-center gap-1 pt-0.5 font-medium">
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                  <span>Primary Default Administrator</span>
                </div>
              )}
            </div>

            {editAdminError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{editAdminError}</span>
              </div>
            )}

            {editAdminSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{editAdminSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter administrator name"
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Password (Optional)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type={showEditAdminPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep current password"
                    value={editAdminPassword}
                    onChange={(e) => setEditAdminPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                  {editAdminPassword && (
                    <button
                      type="button"
                      onClick={() => setShowEditAdminPassword(!showEditAdminPassword)}
                      aria-label={showEditAdminPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                    >
                      {showEditAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Must be at least 8 characters if changing.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editAdminSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                >
                  {editAdminSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editAdminSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
