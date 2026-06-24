'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  UserIcon, ShieldCheckIcon, CheckCircleIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { getAdminMe, updateAdminMe } from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

interface AdminUser {
  id: string; email: string; fullName: string; profilePhoto?: string; role: string; status: string; createdAt: string
}

interface SmtpForm {
  smtp_host: string; smtp_port: string; smtp_secure: string
  smtp_username: string; smtp_password: string; smtp_from_email: string; smtp_from_name: string
}

const SMTP_DEFAULTS: SmtpForm = {
  smtp_host: '', smtp_port: '465', smtp_secure: 'true',
  smtp_username: '', smtp_password: '', smtp_from_email: '', smtp_from_name: 'Luxotel Reservations',
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'email'>('profile')

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

  // SMTP form
  const [smtp, setSmtp] = useState<SmtpForm>(SMTP_DEFAULTS)
  const [smtpLoading, setSmtpLoading] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpMsg, setSmtpMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || ''
    getAdminMe(token)
      .then(res => {
        if (res?.success && res.user) {
          setUser(res.user); setFullName(res.user.fullName || ''); setEmail(res.user.email || '')
        } else setLoadError(res?.message || 'Failed to load profile.')
      })
      .catch(() => setLoadError('Could not reach server.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab !== 'email') return
    const token = localStorage.getItem('adminToken') || ''
    setSmtpLoading(true)
    fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (data.success) setSmtp(prev => ({ ...prev, ...data.settings })) })
      .catch(() => {})
      .finally(() => setSmtpLoading(false))
  }, [activeTab])

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault(); setProfileMsg(null); setProfileSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await updateAdminMe(token, { fullName, email })
      if (res?.success) { setUser(res.user); setProfileMsg({ ok: true, text: 'Profile updated successfully.' }) }
      else setProfileMsg({ ok: false, text: res?.message || 'Failed to save.' })
    } catch { setProfileMsg({ ok: false, text: 'Server error.' }) }
    finally { setProfileSaving(false) }
  }

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault(); setPwMsg(null)
    if (newPassword !== confirmPassword) { setPwMsg({ ok: false, text: 'New passwords do not match.' }); return }
    if (newPassword.length < 8) { setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return }
    setPwSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await updateAdminMe(token, { currentPassword, newPassword })
      if (res?.success) {
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
        setPwMsg({ ok: true, text: 'Password changed successfully.' })
      } else setPwMsg({ ok: false, text: res?.message || 'Failed to change password.' })
    } catch { setPwMsg({ ok: false, text: 'Server error.' }) }
    finally { setPwSaving(false) }
  }

  const handleSmtpSave = async (e: FormEvent) => {
    e.preventDefault(); setSmtpMsg(null); setSmtpSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(smtp),
      }).then(r => r.json())
      if (res.success) setSmtpMsg({ ok: true, text: 'SMTP settings saved successfully.' })
      else setSmtpMsg({ ok: false, text: res.message || 'Failed to save.' })
    } catch { setSmtpMsg({ ok: false, text: 'Server error.' }) }
    finally { setSmtpSaving(false) }
  }

  const handleSmtpTest = async () => {
    setSmtpMsg(null); setSmtpTesting(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      setSmtpMsg({ ok: res.success, text: res.message })
    } catch { setSmtpMsg({ ok: false, text: 'Could not reach server.' }) }
    finally { setSmtpTesting(false) }
  }

  const sf = (field: keyof SmtpForm, value: string) => setSmtp(prev => ({ ...prev, [field]: value }))

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: UserIcon },
    { id: 'security' as const, name: 'Security', icon: ShieldCheckIcon },
    { id: 'email' as const, name: 'Email (SMTP)', icon: EnvelopeIcon },
  ]

  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (loadError) return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{loadError}</div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account, security, and email configuration.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <nav className="lg:w-52 flex lg:flex-col gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors w-full text-left ${
                activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-5">
          {/* Account info card */}
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
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <input type="text" value={user?.role || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                </div>
                {profileMsg && (
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${profileMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {profileMsg.text}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={profileSaving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
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
                  <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className={inp} />
                  <p className="mt-1 text-xs text-gray-400">Minimum 8 characters.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className={inp} />
                </div>
                {pwMsg && (
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${pwMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {pwMsg.text}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={pwSaving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {pwSaving ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Email / SMTP tab */}
          {activeTab === 'email' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Email (SMTP) Settings</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Used for booking confirmations, OTP, and all outgoing emails.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSmtpTest}
                  disabled={smtpTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {smtpTesting ? 'Testing…' : '⚡ Test Connection'}
                </button>
              </div>

              {smtpLoading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <form onSubmit={handleSmtpSave} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
                      <input type="text" required value={smtp.smtp_host} onChange={e => sf('smtp_host', e.target.value)} placeholder="mail.luxotel.com" className={inp} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                      <input type="number" required value={smtp.smtp_port} onChange={e => sf('smtp_port', e.target.value)} placeholder="465" className={inp} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Encryption</label>
                      <select value={smtp.smtp_secure} onChange={e => sf('smtp_secure', e.target.value)} className={inp}>
                        <option value="true">SSL / TLS (port 465)</option>
                        <option value="false">STARTTLS (port 587)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                      <input type="text" required value={smtp.smtp_username} onChange={e => sf('smtp_username', e.target.value)} placeholder="bookings@luxotel.com" className={inp} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={smtp.smtp_password}
                          onChange={e => sf('smtp_password', e.target.value)}
                          placeholder="••••••••"
                          className={`${inp} pr-10`}
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Leave blank to keep the current password.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">From Email</label>
                      <input type="email" required value={smtp.smtp_from_email} onChange={e => sf('smtp_from_email', e.target.value)} placeholder="bookings@luxotel.com" className={inp} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name</label>
                      <input type="text" value={smtp.smtp_from_name} onChange={e => sf('smtp_from_name', e.target.value)} placeholder="Luxotel Reservations" className={inp} />
                    </div>
                  </div>

                  {smtpMsg && (
                    <div className={`rounded-lg px-4 py-2.5 text-sm ${smtpMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {smtpMsg.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={smtpSaving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {smtpSaving ? 'Saving…' : 'Save SMTP Settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
