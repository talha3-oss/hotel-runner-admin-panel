'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  UserIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { getAdminMe, updateAdminMe } from '../../../lib/api'

interface AdminUser {
  id: string
  email: string
  fullName: string
  profilePhoto?: string
  role: string
  status: string
  createdAt: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  // Profile form
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || ''
    getAdminMe(token)
      .then(res => {
        if (res?.success && res.user) {
          setUser(res.user)
          setFullName(res.user.fullName || '')
          setEmail(res.user.email || '')
        } else {
          setLoadError(res?.message || 'Failed to load profile.')
        }
      })
      .catch(() => setLoadError('Could not reach server.'))
      .finally(() => setLoading(false))
  }, [])

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await updateAdminMe(token, { fullName, email })
      if (res?.success) {
        setUser(res.user)
        setProfileMsg({ ok: true, text: 'Profile updated successfully.' })
      } else {
        setProfileMsg({ ok: false, text: res?.message || 'Failed to save.' })
      }
    } catch {
      setProfileMsg({ ok: false, text: 'Server error.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' })
      return
    }
    setPwSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await updateAdminMe(token, { currentPassword, newPassword })
      if (res?.success) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPwMsg({ ok: true, text: 'Password changed successfully.' })
      } else {
        setPwMsg({ ok: false, text: res?.message || 'Failed to change password.' })
      }
    } catch {
      setPwMsg({ ok: false, text: 'Server error.' })
    } finally {
      setPwSaving(false)
    }
  }

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: UserIcon },
    { id: 'security' as const, name: 'Security', icon: ShieldCheckIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{loadError}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account profile and security.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <nav className="lg:w-52 flex lg:flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors w-full text-left ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* Account info card (always visible) */}
          {user && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold shrink-0">
                {(user.fullName || user.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{user.fullName || '—'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircleIcon className="h-3 w-3" /> {user.status}
                  </span>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">{user.role}</span>
                </div>
              </div>
            </div>
          )}

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Edit Profile</h2>
              </div>
              <form onSubmit={handleProfileSave} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>

                {profileMsg && (
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${profileMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {profileMsg.text}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Change Password</h2>
              </div>
              <form onSubmit={handlePasswordSave} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Minimum 8 characters.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {pwMsg && (
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${pwMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {pwMsg.text}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {pwSaving ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
