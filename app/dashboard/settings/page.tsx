'use client'

import { FormEvent, useEffect, useState } from 'react'
import EmailDesigner from './EmailDesigner'
import { useSearchParams } from 'next/navigation'
import {
  UserIcon, ShieldCheckIcon, CheckCircleIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, KeyIcon,
  PaperAirplaneIcon, GlobeAltIcon, PhotoIcon, TrashIcon, ArrowUpTrayIcon, VideoCameraIcon,
  DocumentTextIcon, CalendarDaysIcon, ScaleIcon, IdentificationIcon, CreditCardIcon,
} from '@heroicons/react/24/outline'
import {
  getAdminMe, updateAdminMe,
  fetchSiteSettings, saveSiteSettings, uploadHomepageSectionImage, getApiAssetUrl,
  fetchUploadLimits, saveUploadLimits, clearUploadLimitsCache, DEFAULT_UPLOAD_LIMITS, UploadLimits,
  fetchBookingPolicy, saveBookingPolicy, DEFAULT_BOOKING_POLICY, BookingPolicy,
  fetchPassportRetention, savePassportRetention, runPassportPurge,
  DEFAULT_PASSPORT_RETENTION, PassportRetention,
  fetchRateCompare, saveRateCompare, DEFAULT_RATE_COMPARE, RateCompare,
  SiteSettings,
} from '../../../lib/api'
import { passwordProblem } from '../../../lib/passwordRule'
import RateTigerLogs from '@/components/RateTigerLogs'
import PaymentLogs from '@/components/PaymentLogs'
import MediaPicker from '@/components/MediaPicker'

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

// ── Each hotel's own reservations mailbox ───────────────────────────────
//
// The client's properties each have their own address. A guest should hear
// from the hotel they are staying at, and be able to reply to it; the hotel
// gets its own copy of every booking, change and cancellation, with the
// guest as the reply address. A hotel left blank here goes on being sent for
// by the Luxotel mailbox above, exactly as before.
//
// Its own component with its own state: the page's SMTP form posts every
// field it holds in one go, and a hotel's credentials have nothing to do
// with that request.
interface HotelMailbox {
  id: string
  name: string
  contactEmail: string
  host: string
  port: string
  secure: string
  username: string
  fromEmail: string
  fromName: string
  notifyEmail: string
  passwordSet: boolean
  ready: boolean
}

const BLANK_MAILBOX = {
  host: '', port: '465', secure: 'true', username: '',
  fromEmail: '', fromName: '', notifyEmail: '',
}

function HotelMailboxes() {
  const [hotels, setHotels] = useState<HotelMailbox[]>([])
  const [loading, setLoading] = useState(true)
  const [pickedId, setPickedId] = useState('')
  const [form, setForm] = useState({ ...BLANK_MAILBOX })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async (keep = '') => {
    const token = localStorage.getItem('adminToken') || ''
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp/hotels`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      if (!res.success) return
      setHotels(res.hotels || [])
      const next = keep || pickedId
      if (next) fill((res.hotels || []).find((h: HotelMailbox) => h.id === next))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const fill = (hotel?: HotelMailbox) => {
    if (!hotel) { setForm({ ...BLANK_MAILBOX }); return }
    setForm({
      host: hotel.host, port: hotel.port || '465', secure: hotel.secure || 'true',
      username: hotel.username, fromEmail: hotel.fromEmail,
      fromName: hotel.fromName, notifyEmail: hotel.notifyEmail,
    })
  }

  const pick = (id: string) => {
    setPickedId(id)
    setPassword('')
    setMsg(null)
    fill(hotels.find(h => h.id === id))
  }

  const picked = hotels.find(h => h.id === pickedId) || null
  const ff = (field: keyof typeof BLANK_MAILBOX, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const save = async () => {
    if (!pickedId) return
    setSaving(true); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp/hotels/${pickedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, password }),
      }).then(r => r.json())
      if (res.success) {
        setPassword('')
        setMsg({
          ok: true,
          text: res.ready
            ? 'Saved. This hotel now sends its own confirmations.'
            : 'Saved. Host, username, password and From Email are all needed before it sends its own — until then the Luxotel mailbox sends for it.',
        })
        await load(pickedId)
      } else {
        setMsg({ ok: false, text: res.message || 'Could not save.' })
      }
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setSaving(false)
    }
  }

  // Saved first on purpose: the server tests what is stored, so testing an
  // unsaved password would report on the old one.
  const test = async () => {
    if (!pickedId) return
    setTesting(true); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/smtp/hotels/${pickedId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      setMsg({ ok: res.success, text: res.message })
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="border-t border-gray-100 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Each Hotel&apos;s Own Mailbox</h3>
          <p className="text-xs text-gray-400 mt-0.5 max-w-2xl">
            A guest gets their confirmation from the hotel they are staying at, and the hotel gets
            its own copy of every booking, change and cancellation — with the guest as the reply
            address, so the two can write to each other directly. A hotel left blank is sent for by
            the Luxotel mailbox above, as it is today.
          </p>
        </div>
        {pickedId && (
          <button
            type="button"
            onClick={test}
            disabled={testing || saving}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? 'Testing…' : '⚡ Test Connection'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading hotels…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hotel</label>
              <select value={pickedId} onChange={e => pick(e.target.value)} className={inputClass}>
                <option value="">Choose a hotel…</option>
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name}{h.ready ? ' — own mailbox' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {picked && (
            <>
              <div
                className={`mt-4 rounded-lg px-4 py-2.5 text-xs ${
                  picked.ready
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {picked.ready ? (
                  <>Guests of {picked.name} hear from <strong>{picked.fromEmail}</strong>, and its copy goes to{' '}
                    <strong>{picked.notifyEmail || picked.fromEmail}</strong>.</>
                ) : (
                  <>
                    {picked.name} has no mailbox of its own yet, so the Luxotel mailbox sends for it.{' '}
                    {picked.contactEmail
                      ? <>Replies and its copy go to <strong>{picked.contactEmail}</strong>, the address on the hotel&apos;s record.</>
                      : <>It has no address on its record either, so it is not being told about its bookings at all.</>}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
                  <input type="text" value={form.host} onChange={e => ff('host', e.target.value)} placeholder="mail.rumreserve.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                  <input type="number" value={form.port} onChange={e => ff('port', e.target.value)} placeholder="465" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Encryption</label>
                  <select value={form.secure} onChange={e => ff('secure', e.target.value)} className={inputClass}>
                    <option value="true">SSL / TLS (port 465)</option>
                    <option value="false">STARTTLS (port 587)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                  <input type="text" value={form.username} onChange={e => ff('username', e.target.value)} placeholder="reservations@rumreserve.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {picked.passwordSet ? 'A password is saved. Leave blank to keep it.' : 'No password saved yet.'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From Email</label>
                  <input type="email" value={form.fromEmail} onChange={e => ff('fromEmail', e.target.value)} placeholder="reservations@rumreserve.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name</label>
                  <input type="text" value={form.fromName} onChange={e => ff('fromName', e.target.value)} placeholder="Rum Reserve Reservations" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Send the hotel&apos;s copy to</label>
                  <input type="email" value={form.notifyEmail} onChange={e => ff('notifyEmail', e.target.value)} placeholder="Leave blank to use the From Email" className={inputClass} />
                  <p className="mt-1 text-xs text-gray-400">
                    Where this hotel reads its bookings, if that is not the address it sends from.
                  </p>
                </div>
              </div>

              {msg && (
                <div className={`mt-5 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {msg.text}
                </div>
              )}

              <div className="flex justify-end pt-5">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : `Save ${picked.name}'s Mailbox`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}


// ── The words on the Login and Sign up pages ────────────────────────────
//
// Every other page's copy is the admin's; these two were written into the
// code, so changing "Not a member yet??" meant a release. A field left empty
// goes back to what the page shipped with rather than leaving a blank band
// across it, which is also why there is no "clear" here.
interface AuthPageContent {
  login: Record<string, string>
  signup: Record<string, string | string[]>
}

const AUTH_FIELDS: { group: 'login' | 'signup'; field: string; label: string; hint?: string; lines?: number }[] = [
  { group: 'login', field: 'heroTitle', label: 'Banner heading', hint: 'The large word over the picture.' },
  { group: 'login', field: 'formHeading', label: 'Form heading' },
  { group: 'login', field: 'sideHeading', label: 'Side heading', hint: 'Over the sign-up invitation.' },
  { group: 'login', field: 'sideText', label: 'Side text', lines: 2 },
  { group: 'login', field: 'sideButton', label: 'Sign-up button' },
  { group: 'login', field: 'corporateText', label: 'Corporate text', lines: 2 },
  { group: 'login', field: 'corporateButton', label: 'Corporate button' },
  { group: 'signup', field: 'eyebrow', label: 'Small line above the title' },
  { group: 'signup', field: 'titleLine1', label: 'Title, first line' },
  { group: 'signup', field: 'titleLine2', label: 'Title, second line' },
  { group: 'signup', field: 'promise', label: 'The promise beside it', lines: 2 },
  { group: 'signup', field: 'promiseNote', label: 'Small print under it' },
  { group: 'signup', field: 'savingsHeading', label: 'Savings heading' },
  { group: 'signup', field: 'savingsText', label: 'Savings text', lines: 3 },
  { group: 'signup', field: 'benefitsHeading', label: 'Benefits heading' },
  { group: 'signup', field: 'faqHeading', label: 'Questions heading' },
]

function AuthPagesTab() {
  const [content, setContent] = useState<AuthPageContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || ''
    fetch(`${API_BASE_URL}/api/v1/admin/settings/auth-content`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d?.success) setContent(d.content) })
      .catch(() => setMsg({ ok: false, text: 'Could not reach the server.' }))
  }, [])

  const set = (group: 'login' | 'signup', field: string, value: string) =>
    setContent(prev => (prev ? { ...prev, [group]: { ...prev[group], [field]: value } } : prev))

  const benefits = (content?.signup?.benefits as string[]) || []
  const setBenefit = (i: number, value: string) =>
    setContent(prev => {
      if (!prev) return prev
      const next = [...((prev.signup.benefits as string[]) || [])]
      next[i] = value
      return { ...prev, signup: { ...prev.signup, benefits: next } }
    })

  const save = async () => {
    if (!content) return
    setSaving(true); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/auth-content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(content),
      }).then(r => r.json())
      if (res.success) { setContent(res.content); setMsg({ ok: true, text: 'Saved. The pages show it straight away.' }) }
      else setMsg({ ok: false, text: res.message || 'Could not save.' })
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setSaving(false)
    }
  }

  const field = (row: typeof AUTH_FIELDS[number]) => {
    const value = String(content?.[row.group]?.[row.field] ?? '')
    return (
      <div key={`${row.group}.${row.field}`} className={row.lines ? 'sm:col-span-2' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{row.label}</label>
        {row.lines ? (
          <textarea rows={row.lines} value={value} onChange={e => set(row.group, row.field, e.target.value)} className={inputClass} />
        ) : (
          <input type="text" value={value} onChange={e => set(row.group, row.field, e.target.value)} className={inputClass} />
        )}
        {row.hint && <p className="mt-1 text-xs text-gray-400">{row.hint}</p>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Login &amp; Signup Pages</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          The words on the two pages guests see when they sign in or join. Leave a field empty and
          it goes back to the wording the site came with.
        </p>
      </div>

      {!content ? (
        <p className="p-6 text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Login page</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {AUTH_FIELDS.filter(f => f.group === 'login').map(field)}
            </div>
          </section>

          <section className="pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Sign up page</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {AUTH_FIELDS.filter(f => f.group === 'signup').map(field)}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">The three benefit cards</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    type="text"
                    value={benefits[i] || ''}
                    onChange={e => setBenefit(i, e.target.value)}
                    className={inputClass}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">Their icons stay as they are; only the words change.</p>
            </div>
          </section>

          {msg && (
            <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Page Content'}
            </button>
          </div>
        </div>
      )}
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

// Where our bookings are sent. Every other RateTiger message arrives here; this
// is the one that leaves, so it needs their address rather than ours.
interface RtResForm {
  ratetiger_reservation_url: string
  ratetiger_channel_code: string
  ratetiger_channel_name: string
  ratetiger_auth_header_name: string
  ratetiger_auth_header_value: string
  ratetiger_auth_header2_name: string
  ratetiger_auth_header2_value: string
  ratetiger_auth_url: string
  ratetiger_auth_basic_username: string
  ratetiger_auth_basic_password: string
  ratetiger_api_key: string
  ratetiger_partner_id: string
}

const RT_RES_DEFAULTS: RtResForm = {
  ratetiger_reservation_url: '',
  ratetiger_channel_code: '',
  ratetiger_channel_name: '',
  ratetiger_auth_header_name: '',
  ratetiger_auth_header_value: '',
  ratetiger_auth_header2_name: '',
  ratetiger_auth_header2_value: '',
  ratetiger_auth_url: '',
  ratetiger_auth_basic_username: '',
  ratetiger_auth_basic_password: '',
  ratetiger_api_key: '',
  ratetiger_partner_id: '',
}

// The card gateway. Capital Bank's account, Areeba's gateway, CyberSource
// underneath -- see src/api/v1/integrations/capitalbank/README.md in the
// backend for which of those matters when.
//
// Kept here rather than in .env because the credentials arrive from the bank
// after the server is running, and because moving from the test gateway to
// the live one should not need a deploy.
interface PaymentsForm {
  capitalbank_enabled: boolean
  capitalbank_environment: string
  capitalbank_merchant_id: string
  capitalbank_key_id: string
  capitalbank_shared_secret: string
  capitalbank_currency: string
  capitalbank_amount_decimals: string
  capitalbank_country: string
  capitalbank_locale: string
  capitalbank_target_origins: string
  capitalbank_paynow_type: string
  capitalbank_payathotel_type: string
  capitalbank_three_ds: boolean
  capitalbank_hold_basis: string
  capitalbank_hold_fixed: string
}

const PAYMENTS_DEFAULTS: PaymentsForm = {
  capitalbank_enabled: false,
  capitalbank_environment: 'test',
  capitalbank_merchant_id: '',
  capitalbank_key_id: '',
  capitalbank_shared_secret: '',
  capitalbank_currency: 'JOD',
  // Three. Jordanian dinar is a three-decimal currency and the gateway
  // refuses two outright -- see the backend integration's README.
  capitalbank_amount_decimals: '3',
  capitalbank_country: 'JO',
  capitalbank_locale: 'en_US',
  capitalbank_target_origins: '',
  capitalbank_paynow_type: 'CAPTURE',
  capitalbank_payathotel_type: 'AUTH',
  capitalbank_three_ds: false,
  capitalbank_hold_basis: 'first_night',
  capitalbank_hold_fixed: '0',
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'site' | 'uploads' | 'security' | 'email' | 'emails' | 'booking-policy' | 'passports' | 'rate-compare' | 'auth-pages' | 'partner-api' | 'payments' | 'payment-logs' | 'ratetiger' | 'ratetiger-logs'>('profile')

  // The header's menu links here with ?tab=..., so Profile and Settings land
  // where they say they will instead of always opening on Profile.
  const searchParams = useSearchParams()
  useEffect(() => {
    const wanted = searchParams.get('tab')
    const allowed = ['profile', 'site', 'uploads', 'security', 'email', 'emails', 'auth-pages', 'partner-api', 'ratetiger', 'ratetiger-logs']
    if (wanted && allowed.includes(wanted)) {
      setActiveTab(wanted as typeof activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Site settings — the name, logo and favicon the public site uses.
  const [site, setSite] = useState<SiteSettings>({
    siteName: '', siteTagline: '', logo: '', favicon: '', logoHeight: 56,
    termsUrl: '', privacyUrl: '',
  })
  const [siteSaving, setSiteSaving] = useState(false)
  const [siteUploading, setSiteUploading] = useState<'logo' | 'favicon' | null>(null)
  const [siteMsg, setSiteMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

  const [pay, setPay] = useState<PaymentsForm>(PAYMENTS_DEFAULTS)
  const [payLoading, setPayLoading] = useState(false)
  const [paySaving, setPaySaving] = useState(false)
  const [payTesting, setPayTesting] = useState(false)
  const [paySweeping, setPaySweeping] = useState(false)
  // Whether a shared secret is stored. A flag, not the value -- the secret
  // never leaves the server, so the box is always empty and blank on save
  // means "leave it alone".
  const [paySecretStored, setPaySecretStored] = useState(false)
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [rtRes, setRtRes] = useState<RtResForm>(RT_RES_DEFAULTS)
  const [rtResLoading, setRtResLoading] = useState(false)
  const [rtResSaving, setRtResSaving] = useState(false)
  const [rtResRetrying, setRtResRetrying] = useState(false)
  const [rtAuthValueStored, setRtAuthValueStored] = useState(false)
  const [rtAuth2ValueStored, setRtAuth2ValueStored] = useState(false)
  const [rtBasicPasswordStored, setRtBasicPasswordStored] = useState(false)
  const [rtResMsg, setRtResMsg] = useState<{ ok: boolean; text: string } | null>(null)
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

  useEffect(() => {
    if (activeTab !== 'payments') return
    const token = localStorage.getItem('adminToken') || ''
    setPayLoading(true)
    fetch(`${API_BASE_URL}/api/v1/admin/settings/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) return
        const st = data.settings || {}
        setPaySecretStored(Boolean(st.capitalbank_shared_secret_set))
        setPay(prev => ({
          ...prev,
          capitalbank_enabled: Boolean(st.capitalbank_enabled),
          capitalbank_environment: String(st.capitalbank_environment || 'test'),
          capitalbank_merchant_id: String(st.capitalbank_merchant_id || ''),
          capitalbank_key_id: String(st.capitalbank_key_id || ''),
          // Never sent back, so it stays empty here too.
          capitalbank_shared_secret: '',
          capitalbank_currency: String(st.capitalbank_currency || 'JOD'),
          capitalbank_amount_decimals: String(st.capitalbank_amount_decimals ?? '3'),
          capitalbank_country: String(st.capitalbank_country || 'JO'),
          capitalbank_locale: String(st.capitalbank_locale || 'en_US'),
          capitalbank_target_origins: String(st.capitalbank_target_origins || ''),
          capitalbank_paynow_type: String(st.capitalbank_paynow_type || 'CAPTURE'),
          capitalbank_payathotel_type: String(st.capitalbank_payathotel_type || 'AUTH'),
          capitalbank_three_ds: Boolean(st.capitalbank_three_ds),
          capitalbank_hold_basis: String(st.capitalbank_hold_basis || 'first_night'),
          capitalbank_hold_fixed: String(st.capitalbank_hold_fixed ?? '0'),
        }))
      })
      .catch(() => {})
      .finally(() => setPayLoading(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'ratetiger') return
    const token = localStorage.getItem('adminToken') || ''
    setRtResLoading(true)
    fetch(`${API_BASE_URL}/api/v1/admin/settings/ratetiger-reservation`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) return
        // A flag, not a field — the auth value can be a credential and never
        // leaves the server.
        const {
          ratetiger_auth_header_value_set,
          ratetiger_auth_header2_value_set,
          ratetiger_auth_basic_password_set,
          ...settings
        } = data.settings
        setRtBasicPasswordStored(Boolean(ratetiger_auth_basic_password_set))
        setRtAuthValueStored(Boolean(ratetiger_auth_header_value_set))
        setRtAuth2ValueStored(Boolean(ratetiger_auth_header2_value_set))
        setRtRes(prev => ({ ...prev, ...settings }))
      })
      .catch(() => {})
      .finally(() => setRtResLoading(false))
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
    const weak = passwordProblem(newPassword)
    if (weak) { setPwMsg({ ok: false, text: weak }); return }
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

  const handlePaySave = async (e: FormEvent) => {
    e.preventDefault(); setPayMsg(null); setPaySaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pay),
      }).then(r => r.json())
      if (res.success) {
        setPayMsg({ ok: true, text: 'Payment settings saved.' })
        if (pay.capitalbank_shared_secret.trim()) setPaySecretStored(true)
        setPay(prev => ({ ...prev, capitalbank_shared_secret: '' }))
      } else setPayMsg({ ok: false, text: res.message || 'Failed to save.' })
    } catch { setPayMsg({ ok: false, text: 'Server error.' }) }
    finally { setPaySaving(false) }
  }

  // A real signed call that charges nothing: it asks the gateway for a
  // payment session and throws it away. The only honest way to find out the
  // credentials are right before a guest does.
  const handlePayTest = async () => {
    setPayMsg(null); setPayTesting(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/payments/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      setPayMsg({ ok: Boolean(res.success), text: res.message || (res.success ? 'Connected.' : 'Could not connect.') })
    } catch { setPayMsg({ ok: false, text: 'Server error.' }) }
    finally { setPayTesting(false) }
  }

  // Money the bank is holding that no booking belongs to -- a guest whose
  // browser never came back, or a refund that could not be sent at the
  // time. It runs on its own every ten minutes; this is the same thing on
  // demand, for when somebody is standing over it.
  const handlePaySweep = async () => {
    setPayMsg(null); setPaySweeping(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/payments/sweep`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())

      if (!res.success) setPayMsg({ ok: false, text: res.message || 'The check could not run.' })
      else if (res.ran === false) setPayMsg({ ok: false, text: `Not checked — ${res.reason}.` })
      else if (res.orphans === 0) setPayMsg({ ok: true, text: 'Checked. Every payment has a booking against it.' })
      else setPayMsg({
        ok: res.failed === 0,
        text: `${res.orphans} payment${res.orphans === 1 ? '' : 's'} with no booking. `
          + `${res.returned} returned to the guest`
          + (res.failed ? `, ${res.failed} could not be returned — see Payment Logs.` : '.'),
      })
    } catch { setPayMsg({ ok: false, text: 'Server error.' }) }
    finally { setPaySweeping(false) }
  }

  const yf = (field: keyof PaymentsForm, value: string | boolean) =>
    setPay(prev => ({ ...prev, [field]: value }) as PaymentsForm)

  const handleRtResSave = async (e: FormEvent) => {
    e.preventDefault(); setRtResMsg(null); setRtResSaving(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/ratetiger-reservation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(rtRes),
      }).then(r => r.json())
      if (res.success) {
        setRtResMsg({ ok: true, text: 'RateTiger reservation settings saved.' })
        if (rtRes.ratetiger_auth_header_value.trim()) setRtAuthValueStored(true)
        if (rtRes.ratetiger_auth_header2_value.trim()) setRtAuth2ValueStored(true)
        if (rtRes.ratetiger_auth_basic_password.trim()) setRtBasicPasswordStored(true)
        setRtRes(prev => ({
          ...prev,
          ratetiger_auth_header_value: '',
          ratetiger_auth_header2_value: '',
          ratetiger_auth_basic_password: '',
        }))
      } else setRtResMsg({ ok: false, text: res.message || 'Failed to save.' })
    } catch { setRtResMsg({ ok: false, text: 'Server error.' }) }
    finally { setRtResSaving(false) }
  }

  const handleRtResRetry = async () => {
    setRtResMsg(null); setRtResRetrying(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/ratetiger-reservation/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      if (res.success) {
        setRtResMsg({
          ok: true,
          text: res.attempted
            ? `Retried ${res.attempted} booking(s); ${res.sent ?? 0} delivered.`
            : 'Nothing is waiting to be sent.',
        })
      } else setRtResMsg({ ok: false, text: res.message || 'Retry failed.' })
    } catch { setRtResMsg({ ok: false, text: 'Server error.' }) }
    finally { setRtResRetrying(false) }
  }

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    fetchSiteSettings(token)
      .then(r => { if (r.success && r.settings) setSite(r.settings) })
      .catch(() => {})
  }, [])

  const uploadSiteImage = async (kind: 'logo' | 'favicon', file: File) => {
    setSiteUploading(kind)
    setSiteMsg(null)
    try {
      const r = await uploadHomepageSectionImage(file)
      if (r.success && r.data?.fileUrl) {
        setSite(prev => ({ ...prev, [kind]: r.data.fileUrl }))
        // Uploaded but not yet the site's — Save is what publishes it.
        setSiteMsg({ ok: true, text: 'Uploaded. Click Save Site Settings to publish it.' })
      } else {
        setSiteMsg({ ok: false, text: r.message || 'Upload failed.' })
      }
    } catch {
      setSiteMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setSiteUploading(null)
    }
  }

  const handleSiteSave = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSiteSaving(true)
    setSiteMsg(null)
    try {
      const r = await saveSiteSettings(token, site)
      if (r.success) {
        if (r.settings) setSite(r.settings)
        setSiteMsg({ ok: true, text: 'Site settings saved.' })
      } else {
        setSiteMsg({ ok: false, text: r.message || 'Failed to save.' })
      }
    } catch {
      setSiteMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setSiteSaving(false)
    }
  }

  const rf = (field: keyof RtResForm, value: string) => setRtRes(prev => ({ ...prev, [field]: value }))

  // ── Upload limits ──────────────────────────────────────────────────────
  const [limits, setLimits] = useState<UploadLimits>(DEFAULT_UPLOAD_LIMITS)
  const [limitsMax, setLimitsMax] = useState(190)
  const [limitsDirty, setLimitsDirty] = useState(false)
  const [limitsSaving, setLimitsSaving] = useState(false)
  const [limitsLoaded, setLimitsLoaded] = useState(false)
  const [limitsMsg, setLimitsMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (activeTab !== 'uploads' || limitsLoaded) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    fetchUploadLimits(token)
      .then(r => {
        if (r.success && r.limits) setLimits(r.limits)
        if (r.maxMb) setLimitsMax(r.maxMb)
        setLimitsLoaded(true)
        setLimitsDirty(false)
      })
      .catch(() => {})
  }, [activeTab, limitsLoaded])

  const handleLimitsSave = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLimitsSaving(true)
    try {
      const r = await saveUploadLimits(token, limits)
      if (r.success) {
        // What came back, not what was typed: a number above what the proxy
        // allows is brought into range on the way in.
        if (r.limits) setLimits(r.limits)
        clearUploadLimitsCache()
        setLimitsDirty(false)
        setLimitsMsg({ ok: true, text: 'Saved. New uploads use these sizes straight away.' })
      } else {
        setLimitsMsg({ ok: false, text: r.message || 'Could not save the limits.' })
      }
    } catch {
      setLimitsMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setLimitsSaving(false)
    }
  }

  const editLimit = (kind: keyof UploadLimits, raw: string) => {
    const n = Number(raw)
    setLimits(prev => ({ ...prev, [kind]: Number.isFinite(n) ? n : prev[kind] }))
    setLimitsDirty(true)
  }

  // ── What a guest may still ask for ─────────────────────────────────────
  //
  // Cancel, move the dates, change the name: how many days before arrival
  // each one closes, and whether it is offered at all. These used to be
  // offered to anybody whose stay had not ended, which is how a guest could
  // ask to cancel on the morning they arrived.
  const [policy, setPolicy] = useState<BookingPolicy>(DEFAULT_BOOKING_POLICY)
  const [policyMax, setPolicyMax] = useState(90)
  const [policyDirty, setPolicyDirty] = useState(false)
  const [policySaving, setPolicySaving] = useState(false)
  const [policyLoaded, setPolicyLoaded] = useState(false)
  const [policyMsg, setPolicyMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (activeTab !== 'booking-policy' || policyLoaded) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    fetchBookingPolicy(token)
      .then(r => {
        if (r.success && r.policy) setPolicy(r.policy)
        if (r.maxDays) setPolicyMax(r.maxDays)
        setPolicyLoaded(true)
        setPolicyDirty(false)
      })
      .catch(() => {})
  }, [activeTab, policyLoaded])

  const editPolicy = (kind: keyof BookingPolicy, patch: Partial<BookingPolicy[keyof BookingPolicy]>) => {
    setPolicy(prev => ({ ...prev, [kind]: { ...prev[kind], ...patch } }))
    setPolicyDirty(true)
  }

  const handlePolicySave = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setPolicySaving(true)
    try {
      const r = await saveBookingPolicy(token, policy)
      if (r.success) {
        // What came back, not what was typed: a day count outside what the
        // code allows is brought into range on the way in.
        if (r.policy) setPolicy(r.policy)
        setPolicyDirty(false)
        setPolicyMsg({ ok: true, text: 'Saved. Guests see this on their booking page straight away.' })
      } else {
        setPolicyMsg({ ok: false, text: r.message || 'Could not save the policy.' })
      }
    } catch {
      setPolicyMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setPolicySaving(false)
    }
  }

  // ── How long a guest's passport is kept ────────────────────────────────
  //
  // The files are encrypted where they sit, which protects a copy that has
  // left the server. Against somebody who has the server it buys nothing --
  // the key is in .env beside them -- and the only thing that does is not
  // holding the document any longer than the desk needs it.
  //
  // Off until somebody turns it on. This deletes guests' data for good, so
  // it is not something a deploy should quietly begin doing.
  const [retention, setRetention] = useState<PassportRetention>(DEFAULT_PASSPORT_RETENTION)
  const [retentionRange, setRetentionRange] = useState({ min: 1, max: 365 })
  const [retentionDirty, setRetentionDirty] = useState(false)
  const [retentionSaving, setRetentionSaving] = useState(false)
  const [retentionLoaded, setRetentionLoaded] = useState(false)
  const [retentionRunning, setRetentionRunning] = useState(false)
  const [retentionMsg, setRetentionMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (activeTab !== 'passports' || retentionLoaded) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    fetchPassportRetention(token)
      .then(r => {
        if (r.success && r.retention) setRetention(r.retention)
        if (r.minDays && r.maxDays) setRetentionRange({ min: r.minDays, max: r.maxDays })
        setRetentionLoaded(true)
        setRetentionDirty(false)
      })
      .catch(() => {})
  }, [activeTab, retentionLoaded])

  const handleRetentionSave = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setRetentionSaving(true)
    try {
      const r = await savePassportRetention(token, retention)
      if (r.success) {
        // What came back, not what was typed: a day count outside what the
        // code allows is brought into range on the way in.
        if (r.retention) setRetention(r.retention)
        setRetentionDirty(false)
        setRetentionMsg({
          ok: true,
          text: r.retention?.on
            ? `Saved. Documents are deleted ${r.retention.days} day${r.retention.days === 1 ? '' : 's'} after check-out, from the next hourly sweep.`
            : 'Saved. Nothing is being deleted.',
        })
      } else {
        setRetentionMsg({ ok: false, text: r.message || 'Could not save.' })
      }
    } catch {
      setRetentionMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setRetentionSaving(false)
    }
  }

  const handleRetentionRun = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!confirm('Delete now every passport whose stay ended longer ago than the number of days above?\n\nThis cannot be undone.')) return
    setRetentionRunning(true)
    try {
      const r = await runPassportPurge(token)
      setRetentionMsg({
        ok: r.success,
        text: r.success
          ? `${r.message}${r.failed ? ` ${r.failed} could not be removed — see the server log.` : ''}`
          : r.message || 'Could not run it.',
      })
    } catch {
      setRetentionMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setRetentionRunning(false)
    }
  }

  // ── The travel sites the booking page compares against ─────────────────
  //
  // Names and logos only. The price under each one is the rate this property
  // already publishes to them through RateTiger -- the room's full price,
  // before Luxotel's own discount, which is deliberately never sent out. So
  // there is no price to type here and nothing that can go stale.
  const [compare, setCompare] = useState<RateCompare>(DEFAULT_RATE_COMPARE)
  const [compareMax, setCompareMax] = useState(6)
  const [compareHeightRange, setCompareHeightRange] = useState({ min: 12, max: 56, default: 20 })
  const [compareDirty, setCompareDirty] = useState(false)
  const [compareSaving, setCompareSaving] = useState(false)
  const [compareLoaded, setCompareLoaded] = useState(false)
  // Which row's logo is being chosen. The library and the upload -- with its
  // progress bar -- both live in MediaPicker, so this screen only has to say
  // which row the chosen file belongs to.
  const [comparePicking, setComparePicking] = useState<number | null>(null)
  const [compareMsg, setCompareMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (activeTab !== 'rate-compare' || compareLoaded) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    fetchRateCompare(token)
      .then(r => {
        if (r.success && r.rateCompare) setCompare(r.rateCompare)
        if (r.maxItems) setCompareMax(r.maxItems)
        if (r.heightRange) setCompareHeightRange(r.heightRange)
        setCompareLoaded(true)
        setCompareDirty(false)
      })
      .catch(() => {})
  }, [activeTab, compareLoaded])

  const editCompareItem = (index: number, patch: Partial<{ name: string; logo: string }>) => {
    setCompare(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
    setCompareDirty(true)
  }

  const handleCompareSave = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setCompareSaving(true)
    try {
      const r = await saveRateCompare(token, compare)
      if (r.success) {
        // What came back, not what was typed: a row left without a name is
        // dropped on the way in, which is also how one is deleted.
        if (r.rateCompare) setCompare(r.rateCompare)
        setCompareDirty(false)
        setCompareMsg({ ok: true, text: 'Saved. The booking page shows this straight away.' })
      } else {
        setCompareMsg({ ok: false, text: r.message || 'Could not save.' })
      }
    } catch {
      setCompareMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setCompareSaving(false)
    }
  }

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: UserIcon },
    { id: 'site' as const, name: 'Site Settings', icon: GlobeAltIcon },
    { id: 'uploads' as const, name: 'Uploads', icon: ArrowUpTrayIcon },
    { id: 'security' as const, name: 'Security', icon: ShieldCheckIcon },
    { id: 'email' as const, name: 'Email (SMTP)', icon: EnvelopeIcon },
    // What the site sends, as opposed to how it sends it.
    { id: 'emails' as const, name: 'Emails', icon: EnvelopeIcon },
    // How late a guest may ask the desk for something. Its own tab rather
    // than a corner of Site Settings: it is the one place three different
    // rules are set, and it changes what the guest's page offers.
    { id: 'booking-policy' as const, name: 'Booking Policy', icon: CalendarDaysIcon },
    // The travel sites the booking page compares prices against. Beside
    // Booking Policy because both change what the guest is shown, not what
    // anything costs.
    // Its own tab rather than a line under Security: it is the only setting
    // that deletes a guest's data for good, and it deserves to be read before
    // it is switched on rather than found by somebody changing a password.
    { id: 'passports' as const, name: 'Guest Passports', icon: IdentificationIcon },
    { id: 'rate-compare' as const, name: 'Price Comparison', icon: ScaleIcon },
    { id: 'auth-pages' as const, name: 'Login & Signup', icon: UserIcon },
    { id: 'partner-api' as const, name: 'Partner API', icon: KeyIcon },
    // The card gateway. Above RateTiger because a payment that does not work
    // is a booking that never happens, while RateTiger is what happens after.
    { id: 'payments' as const, name: 'Payments', icon: CreditCardIcon },
    // Its own tab, beside the settings rather than inside them, for the
    // same reason as the RateTiger log: the settings are filled in once and
    // left, while this is opened in a hurry when somebody says they were
    // charged and the booking says otherwise.
    { id: 'payment-logs' as const, name: 'Payment Logs', icon: DocumentTextIcon },
    { id: 'ratetiger' as const, name: 'RateTiger', icon: PaperAirplaneIcon },
    // Its own tab rather than a section under RateTiger: the settings there
    // are filled in once and left, while this is read whenever a rate looks
    // wrong, and it was buried under a form nobody scrolls past.
    { id: 'ratetiger-logs' as const, name: 'RateTiger Logs', icon: DocumentTextIcon },
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

          {/* Uploads tab — how large a picture or a video may be. */}
          {activeTab === 'uploads' && (
            <form onSubmit={handleLimitsSave} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Upload Limits</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  The largest file the panel will accept. These used to be fixed and needed a
                  developer to change.
                </p>
              </div>

              {limitsMsg && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${limitsMsg.ok
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {limitsMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700" htmlFor="limitImage">
                    <PhotoIcon className="h-4 w-4 text-gray-400" /> Pictures
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="limitImage"
                      type="number"
                      min={1}
                      max={limitsMax}
                      value={limits.image}
                      onChange={(e) => editLimit('image', e.target.value)}
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-500">MB</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    JPG, PNG, WebP, GIF and AVIF. A photograph straight off a camera is often
                    8&ndash;12 MB.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700" htmlFor="limitVideo">
                    <VideoCameraIcon className="h-4 w-4 text-gray-400" /> Videos
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="limitVideo"
                      type="number"
                      min={1}
                      max={limitsMax}
                      value={limits.video}
                      onChange={(e) => editLimit('video', e.target.value)}
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-500">MB</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    MP4, WebM, Ogg and MOV. A background video is decoration &mdash; the larger it
                    is, the longer a guest waits before the page settles.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">The most that can be set is {limitsMax} MB.</p>
                <p className="mt-1 text-xs">
                  The server in front of the API refuses anything over 200 MB before the upload
                  ever reaches us, and nothing here could explain that failure &mdash; so a larger
                  number is brought back into range when you save. Raising it further is a change
                  to the server itself.
                </p>
              </div>

              <button
                type="submit"
                disabled={limitsSaving || !limitsDirty}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
              >
                {limitsSaving ? 'Saving…' : 'Save Limits'}
              </button>
            </form>
          )}

          {/* Security tab */}
          {/* Site Settings tab — the name, logo and favicon the public site
              uses. The logo used to be a link to a WordPress install on a
              different site, which nobody here could change. */}
          {activeTab === 'site' && (
            <form onSubmit={handleSiteSave} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Site Settings</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  The name, logo and tab icon used across the public website.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Site Name</label>
                  <input className={inp} value={site.siteName} placeholder="Luxotel"
                    onChange={e => setSite(p => ({ ...p, siteName: e.target.value }))} />
                  <p className="mt-1 text-xs text-gray-400">Shown as the browser tab title.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tagline</label>
                  <input className={inp} value={site.siteTagline} placeholder="Luxury hotel experience"
                    onChange={e => setSite(p => ({ ...p, siteTagline: e.target.value }))} />
                  <p className="mt-1 text-xs text-gray-400">Used as the site description.</p>
                </div>
              </div>

              {/* Where the two links beside the guest's tick point. They were
                  buttons that went nowhere, so a guest agreed to terms they
                  could not open. */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900">Terms &amp; Privacy</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Where the two links go — beside &ldquo;I agree to the…&rdquo; on the payment
                  step, and on the sign-up form. A page on this site
                  (<code className="text-gray-600">/privacy-policy</code>) or a full
                  address (<code className="text-gray-600">https://…</code>). Leave a box
                  empty to go back to the built-in link.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Terms and Conditions
                    </label>
                    <input className={inp} value={site.termsUrl} placeholder="/terms-and-conditions"
                      onChange={e => setSite(p => ({ ...p, termsUrl: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Privacy Policy
                    </label>
                    <input className={inp} value={site.privacyUrl} placeholder="/privacy-policy"
                      onChange={e => setSite(p => ({ ...p, privacyUrl: e.target.value }))} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Pages are written under Pages. A link the server does not recognise as a
                  path or a web address is ignored and the built-in one kept.
                </p>
              </div>

              {/* Logo */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Drawn at the size it will be on the site, on the dark bar
                      it will sit on — guessing a number and then loading the
                      site to look is the part worth removing. */}
                  <div className="flex min-h-[80px] w-56 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-900 p-3">
                    {site.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getApiAssetUrl(site.logo)}
                        alt="Site logo"
                        className="w-auto max-w-full object-contain"
                        style={{ height: site.logoHeight }}
                      />
                    ) : (
                      <PhotoIcon className="h-8 w-8 text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700">Logo</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Shown in the middle of the header on every page. A wide PNG with a transparent
                      background works best — it sits on a dark bar, which is why the preview is dark.
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <label className="shrink-0 text-xs font-medium text-gray-600" htmlFor="logoHeight">Size</label>
                      <input
                        id="logoHeight"
                        type="range"
                        min={24}
                        max={140}
                        step={1}
                        value={site.logoHeight}
                        onChange={e => setSite(p => ({ ...p, logoHeight: Number(e.target.value) }))}
                        className="h-1.5 flex-1 cursor-pointer accent-primary-600"
                      />
                      <span className="w-14 shrink-0 text-right font-mono text-xs text-gray-500">{site.logoHeight}px</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Its height on a wide screen. Phones scale down from this on their own, so there is no
                      second number to fill in.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        {siteUploading === 'logo' ? 'Uploading…' : site.logo ? 'Replace' : 'Upload'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadSiteImage('logo', f) }} />
                      </label>
                      {site.logo && (
                        <button type="button" onClick={() => setSite(p => ({ ...p, logo: '' }))}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                          <TrashIcon className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2">
                    {site.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getApiAssetUrl(site.favicon)} alt="Favicon" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <PhotoIcon className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700">Favicon</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      The small icon on the browser tab. A square PNG, 64×64 or larger.
                      {' '}<strong>.ico and .svg are not accepted</strong> — an SVG can carry a script,
                      so nothing here serves one. A PNG works in every current browser.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        {siteUploading === 'favicon' ? 'Uploading…' : site.favicon ? 'Replace' : 'Upload'}
                        <input type="file" accept="image/png,image/webp" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadSiteImage('favicon', f) }} />
                      </label>
                      {site.favicon && (
                        <button type="button" onClick={() => setSite(p => ({ ...p, favicon: '' }))}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                          <TrashIcon className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {siteMsg && (
                <p className={`text-sm ${siteMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{siteMsg.text}</p>
              )}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Your account</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Your own name and sign-in email are under <strong>Profile</strong>, and your password
                  under <strong>Security</strong>. They belong to you rather than to the site, which is
                  why they are not on this tab.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setActiveTab('profile')}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                    Name &amp; email
                  </button>
                  <button type="button" onClick={() => setActiveTab('security')}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                    Change password
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={siteSaving}
                  className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                  {siteSaving ? 'Saving…' : 'Save Site Settings'}
                </button>
                <p className="text-xs text-gray-400">
                  Leaving the logo empty keeps the built-in one.
                </p>
              </div>
            </form>
          )}

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
                  <p className="mt-1 text-xs text-gray-400">At least 8 characters, with a letter and a number.</p>
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
          {activeTab === 'emails' && <EmailDesigner />}

          {/* Booking Policy tab — how late a guest may ask the desk for
              something about a booking they already have. */}
          {activeTab === 'booking-policy' && (
            <form onSubmit={handlePolicySave} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Booking Policy</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  How late a guest may ask the reservations desk to cancel, move or rename a booking from
                  their own booking page. Nothing here changes a booking by itself &mdash; it decides what
                  the guest is offered, and what reaches your desk.
                </p>
              </div>

              {policyMsg && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${policyMsg.ok
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {policyMsg.text}
                </div>
              )}

              <div className="space-y-4">
                {([
                  ['cancel', 'Cancel booking', 'The guest asks you to cancel the whole booking.'],
                  ['dates', 'Change dates', 'The guest asks for a different arrival date or a different number of nights.'],
                  ['name', 'Change guest name', 'The guest asks for the booking to be in somebody else\u2019s name.'],
                ] as const).map(([kind, label, note]) => (
                  <div key={kind} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{label}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{note}</p>
                      </div>
                      <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={policy[kind].on}
                          onChange={(e) => editPolicy(kind, { on: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Offer this
                      </label>
                    </div>

                    <div className={`mt-3 flex items-center gap-2 ${policy[kind].on ? '' : 'opacity-40'}`}>
                      <span className="text-sm text-gray-500">Closes</span>
                      <input
                        type="number"
                        min={0}
                        max={policyMax}
                        disabled={!policy[kind].on}
                        value={policy[kind].days}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          editPolicy(kind, { days: Number.isFinite(n) ? n : policy[kind].days })
                        }}
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                      <span className="text-sm text-gray-500">days before arrival</span>
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                      {policy[kind].on
                        ? policy[kind].days === 0
                          ? 'No day limit \u2014 the guest can ask up to the property\u2019s check-in time on the day they arrive. After that the option is shown closed, with a note to call the property.'
                          : `The guest can ask up to the end of the day ${policy[kind].days} day${policy[kind].days === 1 ? '' : 's'} before they arrive. After that the option is shown closed, with a note to call the property.`
                        : 'Not offered. The guest is told to contact the property directly.'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">Days are counted on the property&rsquo;s own calendar.</p>
                <p className="mt-1 text-xs">
                  Three days before arrival means three days where the hotel is, not three here &mdash; the
                  same as the timed emails. A guest who has already checked in is offered none of the three,
                  whatever is set above. Zero is the one day that does not run to midnight: it closes when
                  the room is ready, at the check-in time set on the hotel.
                </p>
              </div>

              <button
                type="submit"
                disabled={policySaving || !policyDirty}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
              >
                {policySaving ? 'Saving…' : 'Save Policy'}
              </button>
            </form>
          )}

          {activeTab === 'passports' && (
            <form onSubmit={handleRetentionSave} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Guest Passports</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Guests can send their passport ahead of arrival so there is nothing to hand over at the
                  desk. This decides how long the file is kept once the stay is over.
                </p>
              </div>

              {retentionMsg && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${retentionMsg.ok
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {retentionMsg.text}
                </div>
              )}

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Delete passports after the stay</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      The file is removed from the server for good. The booking still records that the guest
                      sent one and when &mdash; only the image goes.
                    </p>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={retention.on}
                      onChange={(e) => { setRetention(p => ({ ...p, on: e.target.checked })); setRetentionDirty(true) }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Delete them
                  </label>
                </div>

                <div className={`mt-3 flex items-center gap-2 ${retention.on ? '' : 'opacity-40'}`}>
                  <span className="text-sm text-gray-500">Keep for</span>
                  <input
                    type="number"
                    min={retentionRange.min}
                    max={retentionRange.max}
                    disabled={!retention.on}
                    value={retention.days}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setRetention(p => ({ ...p, days: Number.isFinite(n) ? n : p.days }))
                      setRetentionDirty(true)
                    }}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                  <span className="text-sm text-gray-500">days after check-out</span>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  {retention.on
                    ? `A guest who checks out today has their passport deleted in ${retention.days} day${retention.days === 1 ? '' : 's'}. The sweep runs every hour, so it goes within an hour of becoming due.`
                    : 'Nothing is deleted. Every passport ever sent stays on the server until somebody removes it by hand.'}
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Why this matters more than the encryption does.</p>
                <p className="mt-1 text-xs">
                  Passport files are encrypted where they sit, which protects a copy that has left the server
                  &mdash; a stolen disk, a backup in the wrong place. It does <strong>not</strong> protect
                  against somebody who gets into the server itself, because the key has to live there for the
                  panel to show you the document. A file that is no longer on the server is the one thing that
                  cannot be taken. Keeping identity documents longer than you need them is also a
                  responsibility in itself.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={retentionSaving || !retentionDirty}
                  className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
                >
                  {retentionSaving ? 'Saving…' : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={handleRetentionRun}
                  disabled={retentionRunning || !retention.on || retentionDirty}
                  title={retentionDirty ? 'Save first' : !retention.on ? 'Switch deletion on first' : undefined}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  {retentionRunning ? 'Running…' : 'Run the clean-up now'}
                </button>
                <span className="text-xs text-gray-400">
                  Runs by itself every hour. This button is for seeing it work without waiting.
                </span>
              </div>
            </form>
          )}

          {activeTab === 'rate-compare' && (
            <form onSubmit={handleCompareSave} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Price Comparison</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  The travel sites named in the &ldquo;Instant Savings&rdquo; banner on the booking page,
                  each shown with the nightly rate you publish to them, next to the lower Luxotel one.
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Logos can be chosen from the media library or uploaded. This is the one place an
                  SVG is accepted &mdash; a logo stays sharp at any size as a vector. One height applies
                  to the whole row, so the logos line up however different their shapes are.
                </p>
              </div>

              {compareMsg && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${compareMsg.ok
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {compareMsg.text}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={compare.on}
                  onChange={(e) => { setCompare(p => ({ ...p, on: e.target.checked })); setCompareDirty(true) }}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Show this comparison on the booking page
              </label>

              <div className={`flex items-center gap-3 ${compare.on ? '' : 'opacity-40'}`}>
                <label className="shrink-0 text-xs font-medium text-gray-600" htmlFor="compareLogoHeight">
                  Logo size
                </label>
                <input
                  id="compareLogoHeight"
                  type="range"
                  min={compareHeightRange.min}
                  max={compareHeightRange.max}
                  step={1}
                  disabled={!compare.on}
                  value={compare.logoHeight}
                  onChange={e => { setCompare(p => ({ ...p, logoHeight: Number(e.target.value) })); setCompareDirty(true) }}
                  className="h-1.5 max-w-xs flex-1 cursor-pointer accent-primary-600"
                />
                <span className="w-14 shrink-0 text-right font-mono text-xs text-gray-500">{compare.logoHeight}px</span>
                {compare.logoHeight !== compareHeightRange.default && (
                  <button
                    type="button"
                    onClick={() => { setCompare(p => ({ ...p, logoHeight: compareHeightRange.default })); setCompareDirty(true) }}
                    className="shrink-0 text-xs text-gray-400 underline hover:text-gray-600"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className={`space-y-3 ${compare.on ? '' : 'opacity-40'}`}>
                {compare.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 p-4">
                    <div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {item.logo ? (
                        /* Drawn at the height it will have on the booking page,
                           so the slider below is judged against the real thing
                           rather than a number. */
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getApiAssetUrl(item.logo)}
                          alt={item.name}
                          className="w-auto max-w-[104px] object-contain"
                          style={{ height: compare.logoHeight }}
                        />
                      ) : (
                        <span className="px-2 text-center text-[11px] leading-tight text-gray-400">No logo &mdash; the name is shown</span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={item.name}
                      maxLength={40}
                      disabled={!compare.on}
                      placeholder="Site name, e.g. Booking.com"
                      onChange={(e) => editCompareItem(i, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                    />

                    <button
                      type="button"
                      disabled={!compare.on}
                      onClick={() => setComparePicking(i)}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      {item.logo ? 'Replace' : 'Choose logo'}
                    </button>

                    {item.logo && (
                      <button
                        type="button"
                        onClick={() => editCompareItem(i, { logo: '' })}
                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        Clear logo
                      </button>
                    )}

                    <button
                      type="button"
                      title="Remove this site"
                      onClick={() => { setCompare(p => ({ ...p, items: p.items.filter((_, j) => j !== i) })); setCompareDirty(true) }}
                      className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {compare.items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
                    No sites listed &mdash; the banner shows its heading only.
                  </p>
                )}

                {compare.items.length < compareMax && (
                  <button
                    type="button"
                    onClick={() => { setCompare(p => ({ ...p, items: [...p.items, { name: '', logo: '' }] })); setCompareDirty(true) }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    + Add a site
                  </button>
                )}
              </div>

              {comparePicking !== null && (
                <MediaPicker
                  kind="image"
                  // The one field in the panel that takes a vector: a company
                  // logo is drawn as one everywhere it comes from, and stays
                  // sharp at any size. Accepted nowhere else.
                  allowSvg
                  onPick={(url) => {
                    editCompareItem(comparePicking, { logo: url })
                    setCompareMsg({ ok: true, text: 'Logo chosen. Click Save to put it on the booking page.' })
                  }}
                  onClose={() => setComparePicking(null)}
                />
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">You are not typing any prices here.</p>
                <p className="mt-1 text-xs">
                  The figure under every logo is the rate this property publishes to those sites &mdash;
                  the room&rsquo;s full price, before the per-room discount, which is the one thing never
                  sent out. The Luxotel figure beside it is the same room after that discount. Change a
                  room&rsquo;s price or its discount and this follows the same minute. If a room has no
                  discount there is nothing to show, so the comparison hides itself rather than printing
                  the same number four times.
                </p>
              </div>

              <button
                type="submit"
                disabled={compareSaving || !compareDirty}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
              >
                {compareSaving ? 'Saving…' : 'Save Comparison'}
              </button>
            </form>
          )}

          {activeTab === 'email' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Email (SMTP) Settings</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Two house mailboxes — one guests see on booking confirmations, one for verification
                  codes and password resets — and, underneath, each hotel&apos;s own reservations address.
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

              {/* Outside the form above on purpose: that one posts every
                  field it holds in one request, and one hotel's credentials
                  have no business in it. */}
              <HotelMailboxes />
            </div>
          )}

          {activeTab === 'auth-pages' && <AuthPagesTab />}

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

          {activeTab === 'payments' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Card Payments — Capital Bank</h2>
                <p className="mt-1 text-sm text-gray-500">
                  The account is with Capital Bank, through Areeba&rsquo;s gateway. None of these
                  are public: the guest&rsquo;s browser never sees any of them, only a one-use
                  token this server creates for each payment. While this is switched off, nothing
                  on the site asks for a card.
                </p>
              </div>

              {payLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
              ) : (
                <form onSubmit={handlePaySave} className="space-y-6">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={pay.capitalbank_enabled}
                        onChange={e => yf('capitalbank_enabled', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-700">Take card payments</span>
                        <span className="mt-0.5 block text-xs text-gray-400">
                          Leave this off until the test below passes. Guests are not asked for a
                          card while it is off.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Gateway</label>
                      <select className={inp} value={pay.capitalbank_environment}
                              onChange={e => yf('capitalbank_environment', e.target.value)}>
                        <option value="test">Test — apitest.cybersource.com</option>
                        <option value="live">Live — api.cybersource.com (real money)</option>
                      </select>
                      <p className="mt-2 text-xs text-gray-400">
                        Test and live have different credentials. Switching here switches both.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Merchant ID</label>
                      <input type="text" className={inp} value={pay.capitalbank_merchant_id}
                             onChange={e => yf('capitalbank_merchant_id', e.target.value)}
                             placeholder="given by the bank" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Key ID</label>
                      <input type="text" className={inp} value={pay.capitalbank_key_id}
                             onChange={e => yf('capitalbank_key_id', e.target.value)}
                             placeholder="the serial number beside the shared secret" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Shared Secret {paySecretStored && <span className="text-xs font-normal text-emerald-600">— stored</span>}
                      </label>
                      <input type="password" className={inp} value={pay.capitalbank_shared_secret}
                             onChange={e => yf('capitalbank_shared_secret', e.target.value)}
                             placeholder={paySecretStored ? 'leave blank to keep the stored one' : 'paste it exactly, no spaces'} />
                      <p className="mt-2 text-xs text-gray-400">
                        Never shown again once saved. One missing character and every payment is
                        refused with no reason given, so paste rather than type it.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Website address the payment form runs on</label>
                    <textarea className={inp} rows={2} value={pay.capitalbank_target_origins}
                              onChange={e => yf('capitalbank_target_origins', e.target.value)}
                              placeholder={'https://frontend.luxotel.com'} />
                    <p className="mt-2 text-xs text-gray-400">
                      Must be https and must match exactly, including any subdomain. One per line.
                      The gateway refuses to draw the form on any address not listed here — which
                      is what stops somebody else putting our payment page on their site.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                      <input type="text" className={inp} value={pay.capitalbank_currency}
                             onChange={e => yf('capitalbank_currency', e.target.value.toUpperCase())} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Decimal places</label>
                      <select className={inp} value={pay.capitalbank_amount_decimals}
                              onChange={e => yf('capitalbank_amount_decimals', e.target.value)}>
                        <option value="2">2 — 206.00</option>
                        <option value="3">3 — 206.000</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                      <input type="text" className={inp} value={pay.capitalbank_country}
                             onChange={e => yf('capitalbank_country', e.target.value.toUpperCase())} maxLength={2} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-medium">Jordanian dinar needs three decimal places.</p>
                    <p className="mt-1 text-xs">
                      Not a preference — the gateway refuses two outright for JOD. Leave this at
                      three unless a property is selling in another currency.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay Now</label>
                      <select className={inp} value={pay.capitalbank_paynow_type}
                              onChange={e => yf('capitalbank_paynow_type', e.target.value)}>
                        <option value="CAPTURE">Take the money now</option>
                        <option value="AUTH">Hold only, take it later</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay at Hotel</label>
                      <select className={inp} value={pay.capitalbank_payathotel_type}
                              onChange={e => yf('capitalbank_payathotel_type', e.target.value)}>
                        <option value="AUTH">Hold only — the hotel takes it at the desk</option>
                        <option value="CAPTURE">Take the money now</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">How much to hold</label>
                      <select className={inp} value={pay.capitalbank_hold_basis}
                              onChange={e => yf('capitalbank_hold_basis', e.target.value)}>
                        <option value="first_night">The first night of every room booked</option>
                        <option value="full_stay">The whole stay</option>
                        <option value="fixed">A set amount</option>
                        <option value="verify_only">Nothing — only check the card is real</option>
                      </select>
                    </div>
                    {pay.capitalbank_hold_basis === 'fixed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Set amount</label>
                        <input type="number" min={0} step="0.01" className={inp}
                               value={pay.capitalbank_hold_fixed}
                               onChange={e => yf('capitalbank_hold_fixed', e.target.value)} />
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={pay.capitalbank_three_ds}
                        onChange={e => yf('capitalbank_three_ds', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-700">Ask the bank to verify the cardholder (3-D Secure)</span>
                        <span className="mt-0.5 block text-xs text-gray-400">
                          The guest gets their bank&rsquo;s own code screen before the payment goes
                          through. Usually required in Jordan — check with the bank, and only turn
                          it on if the account is enabled for it.
                        </span>
                      </span>
                    </label>
                  </div>

                  {payMsg && (
                    <div className={`rounded-lg px-4 py-2.5 text-sm ${payMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {payMsg.text}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handlePayTest}
                          disabled={payTesting}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          {payTesting ? 'Checking…' : 'Test connection'}
                        </button>
                        <button
                          type="button"
                          onClick={handlePaySweep}
                          disabled={paySweeping}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          {paySweeping ? 'Checking…' : 'Check for unmatched payments'}
                        </button>
                      </div>
                      <p className="mt-1.5 max-w-lg text-xs text-gray-400">
                        Test connection charges nothing — save first. The second button looks for
                        money the bank is holding that no booking belongs to, which happens when a
                        guest&rsquo;s browser never comes back after paying, and gives it to them.
                        It runs on its own every ten minutes.
                      </p>
                    </div>
                    <button type="submit" disabled={paySaving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {paySaving ? 'Saving…' : 'Save Payment Settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'ratetiger' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reservation Delivery</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Where bookings made on the Luxotel site are sent. Everything else RateTiger asks
                  for, they come and fetch — this is the one message that leaves us, so it needs
                  their address. Until it is filled in, bookings are saved and held, and they go out
                  automatically once it is set. Nothing is lost in the meantime.
                </p>
              </div>

              {rtResLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
              ) : (
                <form onSubmit={handleRtResSave} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reservation endpoint URL</label>
                    <input
                      type="url"
                      className={inp}
                      value={rtRes.ratetiger_reservation_url}
                      onChange={e => rf('ratetiger_reservation_url', e.target.value)}
                      placeholder="https://…ratetiger.com/…/hotelReservation"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Ask RateTiger for this. New bookings, changes and cancellations all go to this
                      one address.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Channel identity</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      RateTiger issues these; they identify Luxotel as the source of the booking.
                      Every reservation message must carry them.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">channelCode</label>
                        <input
                          type="text"
                          className={inp}
                          value={rtRes.ratetiger_channel_code}
                          onChange={e => rf('ratetiger_channel_code', e.target.value)}
                          placeholder="e.g. 259010"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">channelName</label>
                        <input
                          type="text"
                          className={inp}
                          value={rtRes.ratetiger_channel_name}
                          onChange={e => rf('ratetiger_channel_name', e.target.value)}
                          placeholder="e.g. Luxotel-Website"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Authentication</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      RateTiger authenticates the same way we do, in reverse: we post the
                      credentials they issued to their <span className="font-mono">/authenticate</span>,
                      they return a token, and the reservation carries it. That is why there is no
                      single value to paste — a token is fetched per hour and refreshed on its own.
                      These default to the credentials already saved under Partner API, so normally
                      there is nothing to fill in here.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Authenticate URL</label>
                        <input
                          type="url"
                          className={inp}
                          value={rtRes.ratetiger_auth_url}
                          onChange={e => rf('ratetiger_auth_url', e.target.value)}
                          placeholder="derived from the reservation URL"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Worked out from the reservation URL above; set it only if theirs sits elsewhere.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">BasicAuth username</label>
                        <input
                          type="text"
                          className={inp}
                          value={rtRes.ratetiger_auth_basic_username}
                          onChange={e => rf('ratetiger_auth_basic_username', e.target.value)}
                          placeholder="from Partner API"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">BasicAuth password</label>
                        <input
                          type="password"
                          className={inp}
                          value={rtRes.ratetiger_auth_basic_password}
                          onChange={e => rf('ratetiger_auth_basic_password', e.target.value)}
                          placeholder={rtBasicPasswordStored ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'from Partner API'}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          {rtBasicPasswordStored ? 'A password is available. Leave blank to keep it.' : 'None saved — the Partner API one is used.'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">API-Key</label>
                        <input
                          type="text"
                          className={inp}
                          value={rtRes.ratetiger_api_key}
                          onChange={e => rf('ratetiger_api_key', e.target.value)}
                          placeholder="from Partner API"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">partner_id</label>
                        <input
                          type="text"
                          className={inp}
                          value={rtRes.ratetiger_partner_id}
                          onChange={e => rf('ratetiger_partner_id', e.target.value)}
                          placeholder="from Partner API"
                        />
                      </div>
                    </div>

                    <details className="mt-4">
                      <summary className="text-xs text-gray-500 cursor-pointer">Extra headers (rarely needed)</summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Header name</label>
                          <input type="text" className={inp} value={rtRes.ratetiger_auth_header_name}
                            onChange={e => rf('ratetiger_auth_header_name', e.target.value)} placeholder="API-Key" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Header value</label>
                          <input type="password" className={inp} value={rtRes.ratetiger_auth_header_value}
                            onChange={e => rf('ratetiger_auth_header_value', e.target.value)}
                            placeholder={rtAuthValueStored ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Second header name</label>
                          <input type="text" className={inp} value={rtRes.ratetiger_auth_header2_name}
                            onChange={e => rf('ratetiger_auth_header2_name', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Second header value</label>
                          <input type="password" className={inp} value={rtRes.ratetiger_auth_header2_value}
                            onChange={e => rf('ratetiger_auth_header2_value', e.target.value)}
                            placeholder={rtAuth2ValueStored ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : ''} />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        Sent alongside the token, for anything their endpoint asks for on top of it.
                      </p>
                    </details>
                  </div>

                  {rtResMsg && (
                    <div className={`rounded-lg px-4 py-2.5 text-sm ${rtResMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {rtResMsg.text}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={handleRtResRetry}
                      disabled={rtResRetrying}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {rtResRetrying ? 'Sending…' : 'Send held bookings now'}
                    </button>
                    <button type="submit" disabled={rtResSaving} className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {rtResSaving ? 'Saving…' : 'Save RateTiger Settings'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {activeTab === 'payment-logs' && (
            <div className="p-6">
              <PaymentLogs />
            </div>
          )}

          {/* RateTiger Logs tab */}
          {activeTab === 'ratetiger-logs' && (
            <div className="p-6">
              <RateTigerLogs />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
