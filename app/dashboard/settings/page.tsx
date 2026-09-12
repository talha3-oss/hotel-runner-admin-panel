'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  UserIcon, ShieldCheckIcon, CheckCircleIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, KeyIcon,
} from '@heroicons/react/24/outline'
import { getAdminMe, updateAdminMe } from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

interface AdminUser {
  id: string; email: string; fullName: string; profilePhoto?: string; role: string; status: string; createdAt: string
}

interface SmtpForm {
  smtp_host: string; smtp_port: string; smtp_secure: string
  smtp_username: string; smtp_password: string; smtp_from_email: string; smtp_from_name: string
  system_smtp_host: string; system_smtp_port: string; system_smtp_secure: string
  system_smtp_username: string; system_smtp_password: string
  system_smtp_from_email: string; system_smtp_from_name: string
}

const SMTP_DEFAULTS: SmtpForm = {
  smtp_host: '', smtp_port: '465', smtp_secure: 'true',
  smtp_username: '', smtp_password: '', smtp_from_email: '', smtp_from_name: 'Luxotel Reservations',
  system_smtp_host: '', system_smtp_port: '465', system_smtp_secure: 'true',
  system_smtp_username: '', system_smtp_password: '',
  system_smtp_from_email: '', system_smtp_from_name: 'Luxotel',
}

// The two mailboxes take the same seven fields, so one group renders both.
interface SmtpFieldKeys {
  host: keyof SmtpForm; port: keyof SmtpForm; secure: keyof SmtpForm
  username: keyof SmtpForm; password: keyof SmtpForm
  fromEmail: keyof SmtpForm; fromName: keyof SmtpForm
}

const BOOKING_FIELDS: SmtpFieldKeys = {
  host: 'smtp_host', port: 'smtp_port', secure: 'smtp_secure',
  username: 'smtp_username', password: 'smtp_password',
  fromEmail: 'smtp_from_email', fromName: 'smtp_from_name',
}

const SYSTEM_FIELDS: SmtpFieldKeys = {
  host: 'system_smtp_host', port: 'system_smtp_port', secure: 'system_smtp_secure',
  username: 'system_smtp_username', password: 'system_smtp_password',
  fromEmail: 'system_smtp_from_email', fromName: 'system_smtp_from_name',
}

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

function SmtpFieldGroup({
  fields, values, onChange, required, placeholders, passwordStored,
}: {
  fields: SmtpFieldKeys
  values: SmtpForm
  onChange: (field: keyof SmtpForm, value: string) => void
  required: boolean
  placeholders: { host: string; username: string; fromEmail: string; fromName: string }
  passwordStored: boolean
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
        <input type="text" required={required} value={values[fields.host]} onChange={e => onChange(fields.host, e.target.value)} placeholder={placeholders.host} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
        <input type="number" required={required} value={values[fields.port]} onChange={e => onChange(fields.port, e.target.value)} placeholder="465" className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Encryption</label>
        <select value={values[fields.secure]} onChange={e => onChange(fields.secure, e.target.value)} className={inputClass}>
          <option value="true">SSL / TLS (port 465)</option>
          <option value="false">STARTTLS (port 587)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
        <input type="text" required={required} value={values[fields.username]} onChange={e => onChange(fields.username, e.target.value)} placeholder={placeholders.username} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={values[fields.password]}
            onChange={e => onChange(fields.password, e.target.value)}
            placeholder="••••••••"
            className={`${inputClass} pr-10`}
          />
          <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {passwordStored ? 'A password is saved. Leave blank to keep it.' : 'No password saved yet.'}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">From Email</label>
        <input type="email" required={required} value={values[fields.fromEmail]} onChange={e => onChange(fields.fromEmail, e.target.value)} placeholder={placeholders.fromEmail} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name</label>
        <input type="text" value={values[fields.fromName]} onChange={e => onChange(fields.fromName, e.target.value)} placeholder={placeholders.fromName} className={inputClass} />
      </div>
    </div>
  )
}

interface PartnerApiForm {
  partner_api_key: string; partner_id: string
  partner_basic_auth_username: string; partner_basic_auth_password: string
}

const PARTNER_API_DEFAULTS: PartnerApiForm = {
  partner_api_key: '', partner_id: '',
  partner_basic_auth_username: '', partner_basic_auth_password: '',
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'email' | 'partner-api'>('profile')

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
  const [passwordStored, setPasswordStored] = useState({ booking: false, system: false })
  const [smtpTestingScope, setSmtpTestingScope] = useState<'booking' | 'system' | null>(null)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpMsg, setSmtpMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Partner API form
  const [partnerApi, setPartnerApi] = useState<PartnerApiForm>(PARTNER_API_DEFAULTS)
  const [partnerApiLoading, setPartnerApiLoading] = useState(false)
  const [partnerApiSaving, setPartnerApiSaving] = useState(false)
  const [partnerApiMsg, setPartnerApiMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [basicAuthPasswordStored, setBasicAuthPasswordStored] = useState(false)
  const [showBasicAuthPassword, setShowBasicAuthPassword] = useState(false)
  const [showPartnerApiKey, setShowPartnerApiKey] = useState(false)

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
      .then(data => {
        if (!data.success) return
        // The *_set flags say whether a password is stored; they are not fields.
        const { smtp_password_set, system_smtp_password_set, ...settings } = data.settings
        setPasswordStored({ booking: Boolean(smtp_password_set), system: Boolean(system_smtp_password_set) })
        setSmtp(prev => ({ ...prev, ...settings }))
      })
      .catch(() => {})
      .finally(() => setSmtpLoading(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'partner-api') return
    const token = localStorage.getItem('adminToken') || ''
    setPartnerApiLoading(true)
    fetch(`${API_BASE_URL}/api/v1/admin/settings/partner-api`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) return
        // A flag, not a field — the password itself never leaves the server.
        const { partner_basic_auth_password_set, ...settings } = data.settings
        setBasicAuthPasswordStored(Boolean(partner_basic_auth_password_set))
        setPartnerApi(prev => ({ ...prev, ...settings }))
      })
      .catch(() => {})
      .finally(() => setPartnerApiLoading(false))
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

  // Tests what is saved on the server, not what is typed in the form — so save
  // before testing, or the test still uses the previous credentials.
  const handleSmtpTest = async (scope: 'booking' | 'system') => {
    setSmtpMsg(null); setSmtpTestingScope(scope)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scope }),
      }).then(r => r.json())
      setSmtpMsg({ ok: res.success, text: res.message })
    } catch { setSmtpMsg({ ok: false, text: 'Could not reach server.' }) }
    finally { setSmtpTestingScope(null) }
  }

  const sf = (field: keyof SmtpForm, value: string) => setSmtp(prev => ({ ...prev, [field]: value }))

  const handlePartnerApiSave = async (e: FormEvent) => {
    e.preventDefault(); setPartnerApiMsg(null); setPartnerApiSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/partner-api`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(partnerApi),
      }).then(r => r.json())
      if (res.success) setPartnerApiMsg({ ok: true, text: 'Partner API settings saved successfully.' })
      else setPartnerApiMsg({ ok: false, text: res.message || 'Failed to save.' })
    } catch { setPartnerApiMsg({ ok: false, text: 'Server error.' }) }
    finally { setPartnerApiSaving(false) }
  }

  const pf = (field: keyof PartnerApiForm, value: string) => setPartnerApi(prev => ({ ...prev, [field]: value }))

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: UserIcon },
    { id: 'security' as const, name: 'Security', icon: ShieldCheckIcon },
    { id: 'email' as const, name: 'Email (SMTP)', icon: EnvelopeIcon },
    { id: 'partner-api' as const, name: 'Partner API', icon: KeyIcon },
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
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Email (SMTP) Settings</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Two mailboxes: one guests see on booking confirmations, one for verification codes
                  and password resets.
                </p>
              </div>

              {smtpLoading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <form onSubmit={handleSmtpSave} className="p-6 space-y-8">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">Booking Emails</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Confirmations and invoices sent to guests.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSmtpTest('booking')}
                        disabled={smtpTestingScope !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {smtpTestingScope === 'booking' ? 'Testing…' : '⚡ Test Connection'}
                      </button>
                    </div>
                    <SmtpFieldGroup
                      fields={BOOKING_FIELDS}
                      values={smtp}
                      onChange={sf}
                      required
                      passwordStored={passwordStored.booking}
                      placeholders={{
                        host: 'mail.luxotel.com',
                        username: 'bookings@luxotel.com',
                        fromEmail: 'bookings@luxotel.com',
                        fromName: 'Luxotel Reservations',
                      }}
                    />
                  </section>

                  <section className="pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">System Emails</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Verification codes and password resets. Optional — leave blank to send
                          these from the booking mailbox above.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSmtpTest('system')}
                        disabled={smtpTestingScope !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {smtpTestingScope === 'system' ? 'Testing…' : '⚡ Test Connection'}
                      </button>
                    </div>
                    <SmtpFieldGroup
                      fields={SYSTEM_FIELDS}
                      values={smtp}
                      onChange={sf}
                      required={false}
                      passwordStored={passwordStored.system}
                      placeholders={{
                        host: 'mail.luxotel.com',
                        username: 'noreply@luxotel.com',
                        fromEmail: 'noreply@luxotel.com',
                        fromName: 'Luxotel',
                      }}
                    />
                  </section>

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

          {/* Partner API tab */}
          {activeTab === 'partner-api' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Partner API Credentials</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  The API-Key and partner_id our distribution partners use to authenticate against
                  <code className="mx-1 px-1 py-0.5 rounded bg-gray-100 text-gray-600">POST /api/v1/authenticate</code>
                  Update these here if a partner ever needs new credentials.
                </p>
              </div>

              {partnerApiLoading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <form onSubmit={handlePartnerApiSave} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">API-Key</label>
                      <div className="relative">
                        <input
                          type={showPartnerApiKey ? 'text' : 'password'}
                          required
                          value={partnerApi.partner_api_key}
                          onChange={e => pf('partner_api_key', e.target.value)}
                          placeholder="e.g. NNb1156k4d987bb40gg339u216227j"
                          className={`${inp} pr-10 font-mono`}
                        />
                        <button type="button" onClick={() => setShowPartnerApiKey(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPartnerApiKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">partner_id</label>
                      <input
                        type="text"
                        required
                        value={partnerApi.partner_id}
                        onChange={e => pf('partner_id', e.target.value)}
                        placeholder="e.g. 301900"
                        className={`${inp} font-mono`}
                      />
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">BasicAuth Header</h3>
                    <p className="text-xs text-gray-400 mt-0.5 mb-4">
                      Issued by the partner. They send it as
                      <code className="mx-1 px-1 py-0.5 rounded bg-gray-100 text-gray-600">BasicAuth: Basic &lt;base64 of username:password&gt;</code>
                      on the same call. Without a match the request is rejected before the API-Key is even read.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                        <input
                          type="text"
                          required
                          value={partnerApi.partner_basic_auth_username}
                          onChange={e => pf('partner_basic_auth_username', e.target.value)}
                          placeholder="e.g. luxotel"
                          className={`${inp} font-mono`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showBasicAuthPassword ? 'text' : 'password'}
                            value={partnerApi.partner_basic_auth_password}
                            onChange={e => pf('partner_basic_auth_password', e.target.value)}
                            placeholder="••••••••"
                            className={`${inp} pr-10 font-mono`}
                          />
                          <button type="button" onClick={() => setShowBasicAuthPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showBasicAuthPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {basicAuthPasswordStored ? 'A password is saved. Leave blank to keep it.' : 'No password saved yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {partnerApiMsg && (
                    <div className={`rounded-lg px-4 py-2.5 text-sm ${partnerApiMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {partnerApiMsg.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={partnerApiSaving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {partnerApiSaving ? 'Saving…' : 'Save Partner API Settings'}
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
