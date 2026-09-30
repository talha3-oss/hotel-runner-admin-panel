'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  fetchAdminBookings, updateBookingStatus, fetchAdminRooms,
  previewBookingChange, applyBookingChange,
  BookingRecord, BookingChange, BookingChangeQuote,
} from '../../../lib/api'
import { formatMoney } from '../../../lib/currency'

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const PAYMENT_COLORS: Record<string, string> = {
  PAID: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-600',
}

// Whether RateTiger was told about this booking. Until they know, their
// channels keep offering a room that is already sold — so a booking stuck at
// Pending is a double-booking waiting to happen, not a cosmetic detail.
const RT_LABELS: Record<string, string> = {
  SENT: 'Sent',
  PENDING: 'Pending',
  FAILED: 'Failed',
  SKIPPED: 'Not connected',
}

const RT_COLORS: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
}

const RT_HINTS: Record<string, string> = {
  SENT: 'RateTiger has this booking.',
  PENDING: 'Not delivered yet — it is retried automatically every few minutes.',
  FAILED: 'RateTiger refused it. Retrying will not help; see the reason.',
  SKIPPED: 'This property has no RateTiger hotel code, so nothing is sent.',
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

const fmt = formatMoney

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 50

  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [rtSending, setRtSending] = useState(false)
  const [rtResult, setRtResult] = useState<{ ok: boolean; text: string } | null>(null)

  // Changing a booking. The form holds what the admin has typed; the quote is
  // the server's answer to it. Nothing is written until Apply, and the quote
  // is what Apply sends — so the figure approved is the figure stored.
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<BookingChange>({})
  const [roomOptions, setRoomOptions] = useState<{ id: string; name: string; roomNumber: string }[]>([])
  const [quote, setQuote] = useState<BookingChangeQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [applying, setApplying] = useState(false)

  // Sending a reservation by hand is how the first one gets checked: it happens
  // in the background on a real booking, so without this there is nothing to
  // press and nothing to read but a badge that may take a sweep to change.
  const sendToRateTiger = async (booking: BookingRecord, resStatus = 'Commit') => {
    setRtSending(true)
    setRtResult(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/ratetiger-reservation/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: booking.id, resStatus }),
      }).then(r => r.json())

      if (res.success) {
        setRtResult({
          ok: true,
          text: res.resId ? `Delivered. Their reference: ${res.resId}` : 'Delivered to RateTiger.',
        })
      } else {
        setRtResult({ ok: false, text: res.reason || res.message || 'RateTiger did not accept it.' })
      }

      if (res.booking) {
        setSelectedBooking(prev => (prev ? { ...prev, ...res.booking } : prev))
      }
      load(search, statusFilter, page)
    } catch {
      setRtResult({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setRtSending(false)
    }
  }

  const load = useCallback(async (q = '', s = 'all', p = 1) => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    setError('')
    try {
      const result = await fetchAdminBookings(token, {
        ...(q ? { search: q } : {}),
        ...(s !== 'all' ? { status: s } : {}),
        page: p,
        limit,
      })
      if (result.success) {
        setBookings(result.bookings || [])
        setTotal(result.total || 0)
      } else {
        setError(result.message || 'Failed to load bookings.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(search, statusFilter, page) }, [load, search, statusFilter, page])

  const handleSearch = (v: string) => { setSearch(v); setPage(1); setLoading(true); load(v, statusFilter, 1) }
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); setLoading(true); load(search, v, 1) }

  const handleChangeStatus = async (booking: BookingRecord, newStatus: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setStatusUpdating(true)
    try {
      const result = await updateBookingStatus(token, booking.id, newStatus)
      if (result.success) {
        setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: newStatus } : b))
        if (selectedBooking?.id === booking.id) setSelectedBooking({ ...selectedBooking, status: newStatus })
      } else {
        alert(result.message || 'Failed to update status.')
      }
    } catch {
      alert('Unable to connect to server.')
    } finally {
      setStatusUpdating(false)
    }
  }

  const openEditor = async (b: BookingRecord) => {
    setQuote(null)
    setForm({
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      adults: b.adults,
      childrenAges: Array.isArray(b.childrenAges) ? b.childrenAges : [],
      roomIds: (Array.isArray(b.rooms) ? b.rooms : []).map((r) => r.id),
      firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone,
    })
    setEditing(true)

    const token = localStorage.getItem('adminToken')
    if (!token) return
    try {
      const result = await fetchAdminRooms(token, { limit: '200' })
      const list = (result?.data || result?.rooms || []) as { id: string; name: string; roomNumber: string; hotelName?: string }[]
      setRoomOptions(list.map((r) => ({ id: r.id, name: r.name, roomNumber: r.roomNumber })))
    } catch {
      setRoomOptions([])
    }
  }

  const closeEditor = () => { setEditing(false); setQuote(null); setForm({}) }

  const runQuote = async () => {
    if (!selectedBooking) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setQuoting(true)
    try {
      setQuote(await previewBookingChange(token, selectedBooking.id, form))
    } catch {
      setQuote({ success: false, message: 'Unable to reach the server.' })
    } finally {
      setQuoting(false)
    }
  }

  const runApply = async () => {
    if (!selectedBooking) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setApplying(true)
    try {
      const result = await applyBookingChange(token, selectedBooking.id, form)
      if (result.success) {
        setBookings((prev) => prev.map((b) => b.id === result.booking.id ? result.booking : b))
        setSelectedBooking(result.booking)
        closeEditor()
      } else {
        setQuote({ success: false, message: result.message || 'The change was refused.' })
      }
    } catch {
      setQuote({ success: false, message: 'Unable to reach the server.' })
    } finally {
      setApplying(false)
    }
  }

  const setChildren = (band: '0-5' | '6-12', count: number) => {
    const others = (form.childrenAges || []).filter((a) => a !== band)
    setForm({ ...form, childrenAges: [...others, ...Array(Math.max(0, count)).fill(band)] })
    setQuote(null)
  }
  const childCount = (band: string) => (form.childrenAges || []).filter((a) => a === band).length

  const totalPages = Math.ceil(total / limit)

  const displayName = (b: BookingRecord) => `${b.firstName} ${b.lastName}`
  const rooms = Array.isArray(selectedBooking?.rooms) ? (selectedBooking!.rooms as { name: string; publicRate: number; claytonRate: number }[]) : []
  const extras = Array.isArray(selectedBooking?.extras) ? (selectedBooking!.extras as { name: string; price: number; total: number }[]) : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-sm text-gray-600">{total} total booking{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, reference…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading bookings…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RateTiger</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">No bookings found.</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-semibold text-primary-700">{b.bookingRef}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{displayName(b)}</div>
                      <div className="text-xs text-gray-400">{b.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{b.hotelName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      <div>{b.checkIn}</div>
                      <div className="text-gray-400">{b.nights} night{b.nights !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{fmt(b.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[b.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {b.paymentStatus === 'PAID' ? 'Paid' : b.paymentMethod === 'hotel' ? 'Pay at Hotel' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {b.rateTigerStatus ? (
                        <span
                          title={RT_HINTS[b.rateTigerStatus] || ''}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${RT_COLORS[b.rateTigerStatus] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {RT_LABELS[b.rateTigerStatus] || b.rateTigerStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => { setRtResult(null); setSelectedBooking(b) }}
                        className="text-gray-400 hover:text-primary-600 transition-colors"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-xs px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="text-xs px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedBooking.bookingRef}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Invoice: {selectedBooking.invoice?.invoiceRef || '—'}</p>
              </div>
              <button onClick={() => { setRtResult(null); setSelectedBooking(null) }} className="text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status control */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <select
                  value={selectedBooking.status}
                  disabled={statusUpdating}
                  onChange={(e) => handleChangeStatus(selectedBooking, e.target.value)}
                  className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Change booking */}
              {selectedBooking.status !== 'CANCELLED' && !editing && (
                <button
                  onClick={() => openEditor(selectedBooking)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Change booking
                </button>
              )}

              {editing && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Change booking</h3>
                    <button onClick={closeEditor} className="text-xs text-gray-500 hover:text-gray-800">Cancel</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-gray-600">
                      Check-in
                      <input
                        type="date" value={form.checkIn || ''}
                        onChange={(e) => { setForm({ ...form, checkIn: e.target.value }); setQuote(null) }}
                        className="mt-1 w-full border border-gray-300 rounded-md text-sm px-2 py-1.5"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Check-out
                      <input
                        type="date" value={form.checkOut || ''}
                        onChange={(e) => { setForm({ ...form, checkOut: e.target.value }); setQuote(null) }}
                        className="mt-1 w-full border border-gray-300 rounded-md text-sm px-2 py-1.5"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Adults
                      <input
                        type="number" min={1} value={form.adults ?? 1}
                        onChange={(e) => { setForm({ ...form, adults: Number(e.target.value) }); setQuote(null) }}
                        className="mt-1 w-full border border-gray-300 rounded-md text-sm px-2 py-1.5"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-gray-600">
                        Children 0–5
                        <input
                          type="number" min={0} value={childCount('0-5')}
                          onChange={(e) => setChildren('0-5', Number(e.target.value))}
                          className="mt-1 w-full border border-gray-300 rounded-md text-sm px-2 py-1.5"
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Children 6–12
                        <input
                          type="number" min={0} value={childCount('6-12')}
                          onChange={(e) => setChildren('6-12', Number(e.target.value))}
                          className="mt-1 w-full border border-gray-300 rounded-md text-sm px-2 py-1.5"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Rooms. The same room twice means two of it. */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Rooms</div>
                    <div className="space-y-1">
                      {(form.roomIds || []).map((id, i) => (
                        <div key={`${id}-${i}`} className="flex gap-2">
                          <select
                            value={id}
                            onChange={(e) => {
                              const next = [...(form.roomIds || [])]
                              next[i] = e.target.value
                              setForm({ ...form, roomIds: next }); setQuote(null)
                            }}
                            className="flex-1 border border-gray-300 rounded-md text-sm px-2 py-1.5"
                          >
                            {roomOptions.length === 0 && <option value={id}>{id}</option>}
                            {roomOptions.map((r) => (
                              <option key={r.id} value={r.id}>{r.roomNumber} — {r.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setForm({ ...form, roomIds: (form.roomIds || []).filter((_, j) => j !== i) })
                              setQuote(null)
                            }}
                            className="px-2 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const first = roomOptions[0]?.id || (form.roomIds || [])[0]
                        if (first) { setForm({ ...form, roomIds: [...(form.roomIds || []), first] }); setQuote(null) }
                      }}
                      className="mt-1 text-xs text-primary-600 hover:underline"
                    >
                      + Add room
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone']] as const).map(([key, label]) => (
                      <label key={key} className="text-xs text-gray-600">
                        {label}
                        <input
                          value={(form[key] as string) || ''}
                          onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setQuote(null) }}
                          className="mt-1 w-full border border-gray-300 rounded-md text-sm px-2 py-1.5"
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={runQuote}
                    disabled={quoting}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {quoting ? 'Checking…' : 'Check what this costs'}
                  </button>

                  {quote && !quote.success && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      {quote.message}
                    </div>
                  )}

                  {quote?.success && quote.after && quote.before && (
                    <div className="rounded-md border border-gray-200 bg-white p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-gray-400">&nbsp;</div>
                        <div className="text-gray-400 font-medium">Now</div>
                        <div className="text-gray-400 font-medium">After</div>

                        <div className="text-gray-500">Dates</div>
                        <div className="text-gray-700">{quote.before.checkIn} → {quote.before.checkOut}</div>
                        <div className="text-gray-900 font-medium">{quote.after.checkIn} → {quote.after.checkOut}</div>

                        <div className="text-gray-500">Nights</div>
                        <div className="text-gray-700">{quote.before.nights}</div>
                        <div className="text-gray-900 font-medium">{quote.after.nights}</div>

                        <div className="text-gray-500">Rooms</div>
                        <div className="text-gray-700">{quote.before.rooms?.length ?? 0}</div>
                        <div className="text-gray-900 font-medium">{quote.after.rooms.length}</div>

                        <div className="text-gray-500">Total</div>
                        <div className="text-gray-700">{fmt(quote.before.total)}</div>
                        <div className="text-gray-900 font-semibold">{fmt(quote.after.total)}</div>
                      </div>

                      {typeof quote.difference === 'number' && quote.difference !== 0 && (
                        <div className={`text-xs font-medium ${quote.difference > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {quote.difference > 0
                            ? `The guest owes ${fmt(quote.difference)} more.`
                            : `${fmt(Math.abs(quote.difference))} is due back to the guest.`}
                          {' '}Payment is not taken or refunded here — settle it separately.
                        </div>
                      )}

                      {quote.blocked && quote.blocked.length > 0 ? (
                        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                          {quote.blocked.map((b, i) => <div key={i}>{b}</div>)}
                        </div>
                      ) : (
                        <button
                          onClick={runApply}
                          disabled={applying}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {applying ? 'Applying…' : 'Apply this change'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Guest */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Guest</h3>
                <p className="text-sm font-semibold text-gray-900">{selectedBooking.firstName} {selectedBooking.lastName}</p>
                <p className="text-sm text-gray-500">{selectedBooking.email}</p>
                <p className="text-sm text-gray-500">{selectedBooking.phone}</p>
              </div>

              {/* Stay */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stay</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Hotel: </span><span className="font-medium text-gray-800">{selectedBooking.hotelName}</span></div>
                  <div><span className="text-gray-400">Nights: </span><span className="font-medium text-gray-800">{selectedBooking.nights}</span></div>
                  <div><span className="text-gray-400">Check-in: </span><span className="font-medium text-gray-800">{selectedBooking.checkIn}</span></div>
                  <div><span className="text-gray-400">Check-out: </span><span className="font-medium text-gray-800">{selectedBooking.checkOut}</span></div>
                  <div><span className="text-gray-400">Adults: </span><span className="font-medium text-gray-800">{selectedBooking.adults}</span></div>
                  <div><span className="text-gray-400">Children: </span><span className="font-medium text-gray-800">{selectedBooking.children}</span></div>
                </div>
              </div>

              {/* Rooms */}
              {rooms.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rooms</h3>
                  <div className="space-y-1">
                    {rooms.map((r, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{r.name}</span>
                        <span className="text-gray-500">{fmt(r.claytonRate)} / night</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras */}
              {extras.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Extras</h3>
                  <div className="space-y-1">
                    {extras.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{e.name}</span>
                        <span className="text-gray-500">{fmt(e.total || e.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="border-t border-gray-100 pt-4 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Public Rate Total</span><span>{fmt(selectedBooking.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Luxotel Saving</span><span>−{fmt(selectedBooking.discount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span><span>{fmt(selectedBooking.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Payment</span>
                  <span>{selectedBooking.paymentMethod === 'hotel' ? 'Pay at Hotel' : 'Paid Online'} · {selectedBooking.paymentStatus}</span>
                </div>
              </div>

              {selectedBooking.rateTigerStatus && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">RateTiger</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${RT_COLORS[selectedBooking.rateTigerStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {RT_LABELS[selectedBooking.rateTigerStatus] || selectedBooking.rateTigerStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {RT_HINTS[selectedBooking.rateTigerStatus] || ''}
                  </p>
                  {selectedBooking.rateTigerResId && (
                    <p className="mt-1 text-xs text-gray-400">
                      Their reference: <span className="font-mono">{selectedBooking.rateTigerResId}</span>
                    </p>
                  )}
                  {selectedBooking.rateTigerSentAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      Delivered {fmtDate(selectedBooking.rateTigerSentAt)}
                    </p>
                  )}
                  {selectedBooking.rateTigerLastError && selectedBooking.rateTigerStatus !== 'SENT' && (
                    <p className="mt-1 text-xs text-red-600 break-words">
                      {selectedBooking.rateTigerLastError}
                    </p>
                  )}
                  {(selectedBooking.rateTigerAttempts ?? 0) > 1 && (
                    <p className="mt-1 text-xs text-gray-400">
                      {selectedBooking.rateTigerAttempts} attempts
                    </p>
                  )}

                  {rtResult && (
                    <div className={`mt-2 rounded-md px-3 py-2 text-xs ${rtResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {rtResult.text}
                    </div>
                  )}

                  {selectedBooking.rateTigerStatus !== 'SKIPPED' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => sendToRateTiger(selectedBooking, 'Commit')}
                        disabled={rtSending}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {rtSending ? 'Sending…' : selectedBooking.rateTigerStatus === 'SENT' ? 'Send again' : 'Send to RateTiger'}
                      </button>
                      {selectedBooking.status === 'CANCELLED' && (
                        <button
                          onClick={() => sendToRateTiger(selectedBooking, 'Cancel')}
                          disabled={rtSending}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                        >
                          Send cancellation
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-400">Booked on {fmtDate(selectedBooking.createdAt)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
