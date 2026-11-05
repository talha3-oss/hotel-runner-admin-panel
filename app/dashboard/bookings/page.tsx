'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  fetchAdminBookings, updateBookingStatus, fetchAdminRooms, fetchAdminRoomTypes,
  previewBookingChange, applyBookingChange, fetchHotels,
  BookingRecord, BookingChange, BookingChangeQuote, Hotel,
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
  // A Room row is one (room, rate plan) pair, so the same room appears once
  // per plan under the same name and code. Without the plan beside it the
  // dropdown is eighteen identical-looking lines, and a booking's rooms do not
  // say which rate the guest is on.
  const [roomOptions, setRoomOptions] = useState<
    { id: string; name: string; roomNumber: string; planName: string; planCode: string }[]
  >([])
  // What one room at this property holds. Asked for when the editor opens, so
  // the boxes can say when a room is over-filled instead of letting the admin
  // find out from a refusal after pressing Check.
  const [roomLimits, setRoomLimits] = useState({ adults: 2, underSix: 2, olderChildren: 2, persons: 3 })
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

  const loadRooms = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    try {
      const [roomsResult, typesResult] = await Promise.all([
        fetchAdminRooms(token, { limit: '200' }),
        fetchAdminRoomTypes(token),
      ])

      // Plan name to the code RateTiger knows it by.
      const codes = new Map<string, string>()
      for (const t of (typesResult?.roomTypes || typesResult?.data || []) as { name: string; key?: string }[]) {
        const name = String(t.name || '').trim().toLowerCase()
        const key = String(t.key || '').trim()
        if (!name || !key) continue
        const held = codes.get(name)
        if (!held || key.length < held.length) codes.set(name, key)
      }

      const list = (roomsResult?.rooms || roomsResult?.data || []) as
        { id: string; name: string; roomNumber: string; roomType: string }[]
      setRoomOptions(list.map((r) => ({
        id: r.id,
        name: r.name,
        roomNumber: r.roomNumber,
        planName: r.roomType || '',
        planCode: codes.get(String(r.roomType || '').trim().toLowerCase()) || '',
      })))
    } catch {
      setRoomOptions([])
    }
  }, [])

  // What rate plan a booked room is on. The booking stores only the room id.
  const planOf = (roomId: string) => roomOptions.find((r) => r.id === roomId)

  /** The party laid out room by room.
   *
   *  A booking taken since 2026-11-05 carries its own arrangement and that is
   *  what opens. An older one has none -- nothing recorded where its guests
   *  slept -- so the people are spread evenly over its rooms as a starting
   *  point the admin can correct. It is a guess either way for those, and the
   *  old pooled price is what they were charged, so the quote is what decides
   *  rather than this. */
  const layoutFor = (b: BookingRecord) => {
    const roomIds = (Array.isArray(b.rooms) ? b.rooms : []).map((r) => r.id)
    const count = Math.max(1, roomIds.length)

    const stored = Array.isArray(b.roomOccupancy) ? b.roomOccupancy : null
    if (stored && stored.length === count) {
      return stored.map((r) => ({
        adults: Math.max(1, Number(r.adults) || 1),
        underSix: Math.max(0, Number(r.underSix) || 0),
        olderChildren: Math.max(0, Number(r.olderChildren) || 0),
      }))
    }

    const ages = Array.isArray(b.childrenAges) ? b.childrenAges : []
    let older = ages.filter((a) => a === '6-12').length
    let younger = ages.length - older
    let adults = Math.max(count, Number(b.adults) || 1)

    return Array.from({ length: count }, () => {
      const take = (left: number, each: number) => {
        const n = Math.min(each, left)
        return n
      }
      const a = 1 + take(adults - count, 1)
      adults -= a
      const o = take(older, 1); older -= o
      const u = take(younger, 1); younger -= u
      return { adults: a, underSix: u, olderChildren: o }
    })
  }

  const openEditor = async (b: BookingRecord) => {
    setQuote(null)
    setForm({
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      roomIds: (Array.isArray(b.rooms) ? b.rooms : []).map((r) => r.id),
      roomOccupancy: layoutFor(b),
      firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone,
    })
    setEditing(true)
    if (roomOptions.length === 0) await loadRooms()
    void loadRoomLimits(b.hotelId || null)
  }

  /** What one room at this booking's property holds. Falls back to what every
   *  hotel defaults to if the property cannot be found. */
  const loadRoomLimits = async (hotelId: string | null) => {
    const token = localStorage.getItem('adminToken')
    if (!token || !hotelId) return
    try {
      const result = await fetchHotels(token)
      const hotel = ((result?.hotels || result?.data || []) as Hotel[]).find((h) => h.id === hotelId)
      if (!hotel) return
      const whole = (value: unknown, fallback: number, floor: number) => {
        const n = Math.floor(Number(value))
        return Number.isFinite(n) && n >= floor ? n : fallback
      }
      setRoomLimits({
        adults: whole(hotel.maxAdultsPerRoom, 2, 1),
        underSix: whole(hotel.maxUnderSixPerRoom, 2, 0),
        olderChildren: whole(hotel.maxOlderChildrenPerRoom, 2, 0),
        persons: whole(hotel.maxPersonsPerRoom, 3, 1),
      })
    } catch {
      /* the defaults are already on screen */
    }
  }

  const closeEditor = () => { setEditing(false); setQuote(null); setForm({}) }

  const runQuote = async () => {
    if (!selectedBooking) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setQuoting(true)
    try {
      setQuote(await previewBookingChange(token, selectedBooking.id, changePayload()))
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
      const result = await applyBookingChange(token, selectedBooking.id, changePayload())
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

  // The rooms are what the admin edits; the totals are read off them. They
  // used to be the other way round -- one Adults box and two Children boxes
  // for the whole booking -- and the arrangement the guest booked was lost
  // the moment any of the three changed, which dropped the stay back to the
  // cheaper pooled price without saying so.
  const layout = form.roomOccupancy || []

  const partyTotals = {
    adults: layout.reduce((sum, r) => sum + r.adults, 0),
    underSix: layout.reduce((sum, r) => sum + r.underSix, 0),
    olderChildren: layout.reduce((sum, r) => sum + r.olderChildren, 0),
  }

  const setRoomCount = (index: number, key: 'adults' | 'underSix' | 'olderChildren', value: number) => {
    const floor = key === 'adults' ? 1 : 0
    const next = layout.map((room, i) =>
      i === index ? { ...room, [key]: Math.max(floor, Math.floor(Number(value) || 0)) } : room
    )
    setForm({ ...form, roomOccupancy: next })
    setQuote(null)
  }

  /** Whatever is over a limit in this room, for the line underneath it. */
  const roomProblem = (room: { adults: number; underSix: number; olderChildren: number }) => {
    const people = room.adults + room.underSix + room.olderChildren
    if (room.adults > roomLimits.adults) return `${room.adults} adults — a room here takes ${roomLimits.adults}.`
    if (room.olderChildren > roomLimits.olderChildren) return `${room.olderChildren} children of 6–12 — a room here takes ${roomLimits.olderChildren}.`
    if (room.underSix > roomLimits.underSix) return `${room.underSix} under 6 — a room here takes ${roomLimits.underSix}.`
    if (people > roomLimits.persons) return `${people} people — a room here takes ${roomLimits.persons}.`
    return null
  }

  /** What goes to the server: the rooms as the admin left them, plus the
   *  totals read off them, so the two can never disagree. */
  const changePayload = (): BookingChange => ({
    ...form,
    adults: Math.max(1, partyTotals.adults),
    childrenAges: [
      ...Array(partyTotals.underSix).fill('under6'),
      ...Array(partyTotals.olderChildren).fill('6-12'),
    ],
  })

  const totalPages = Math.ceil(total / limit)

  const displayName = (b: BookingRecord) => `${b.firstName} ${b.lastName}`
  const rooms = Array.isArray(selectedBooking?.rooms)
    ? (selectedBooking!.rooms as { id: string; name: string; publicRate: number; claytonRate: number }[])
    : []
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
                        onClick={() => { setRtResult(null); setSelectedBooking(b); if (roomOptions.length === 0) loadRooms() }}
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
                  </div>

                  {/* Rooms, and who is in each of them.
                      The rule is applied to each room on its own -- an empty
                      place in one room is no use to a child sleeping in
                      another -- so the party is edited here rather than as
                      three totals above. The same room twice means two of it. */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-xs font-medium text-gray-700">Rooms and who is in them</div>
                      <div className="text-[11px] text-gray-400">
                        a room here takes {roomLimits.adults} adults, {roomLimits.underSix} under 6,{' '}
                        {roomLimits.olderChildren} aged 6–12, {roomLimits.persons} people in all
                      </div>
                    </div>

                    <div className="mt-1 space-y-1">
                      <div className="grid grid-cols-[1fr_4rem_4rem_4rem_auto] gap-2 text-[11px] text-gray-400">
                        <span>Room</span>
                        <span>Adults</span>
                        <span>Under 6</span>
                        <span>6–12</span>
                        <span />
                      </div>

                      {(form.roomIds || []).map((id, i) => {
                        const room = layout[i] || { adults: 1, underSix: 0, olderChildren: 0 }
                        const problem = roomProblem(room)
                        return (
                          <div key={`${id}-${i}`}>
                            <div className="grid grid-cols-[1fr_4rem_4rem_4rem_auto] gap-2">
                              <select
                                value={id}
                                onChange={(e) => {
                                  const next = [...(form.roomIds || [])]
                                  next[i] = e.target.value
                                  setForm({ ...form, roomIds: next }); setQuote(null)
                                }}
                                className="border border-gray-300 rounded-md text-sm px-2 py-1.5"
                              >
                                {roomOptions.length === 0 && <option value={id}>{id}</option>}
                                {roomOptions.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.roomNumber} — {r.name}
                                    {r.planName ? ` · ${r.planCode ? `${r.planCode} ` : ''}${r.planName}` : ''}
                                  </option>
                                ))}
                              </select>

                              {([
                                ['adults', room.adults, 1],
                                ['underSix', room.underSix, 0],
                                ['olderChildren', room.olderChildren, 0],
                              ] as const).map(([key, value, floor]) => (
                                <input
                                  key={key}
                                  type="number"
                                  min={floor}
                                  value={value}
                                  onChange={(e) => setRoomCount(i, key, Number(e.target.value))}
                                  className={`border rounded-md text-sm px-2 py-1.5 ${
                                    problem ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                                  }`}
                                />
                              ))}

                              <button
                                onClick={() => {
                                  setForm({
                                    ...form,
                                    roomIds: (form.roomIds || []).filter((_, j) => j !== i),
                                    roomOccupancy: layout.filter((_, j) => j !== i),
                                  })
                                  setQuote(null)
                                }}
                                disabled={(form.roomIds || []).length <= 1}
                                className="px-2 text-xs text-red-600 hover:bg-red-50 rounded disabled:text-gray-300 disabled:hover:bg-transparent"
                              >
                                Remove
                              </button>
                            </div>
                            {problem && (
                              <p className="mt-0.5 text-[11px] text-amber-700">Room {i + 1}: {problem}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <button
                        onClick={() => {
                          const first = roomOptions[0]?.id || (form.roomIds || [])[0]
                          if (!first) return
                          setForm({
                            ...form,
                            roomIds: [...(form.roomIds || []), first],
                            roomOccupancy: [...layout, { adults: 1, underSix: 0, olderChildren: 0 }],
                          })
                          setQuote(null)
                        }}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        + Add room
                      </button>
                      <span className="text-[11px] text-gray-500">
                        {partyTotals.adults} adult{partyTotals.adults === 1 ? '' : 's'}
                        {partyTotals.underSix > 0 && `, ${partyTotals.underSix} under 6`}
                        {partyTotals.olderChildren > 0 && `, ${partyTotals.olderChildren} aged 6–12`}
                      </span>
                    </div>
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

                      {quote.detail && (
                        <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                          {quote.detail.repriced
                            ? 'The stay moved, so the rooms are priced at today’s rates.'
                            : 'The rooms keep the rate the guest booked at — only the stay itself is priced afresh.'}
                        </div>
                      )}

                      {/* Where the rate was held but today's is different, say so, or
                          the admin cannot tell they are honouring an old price. */}
                      {quote.detail && !quote.detail.repriced &&
                        quote.detail.lines.some((l) => l.currentRate !== l.publicRate) && (
                        <div className="text-xs text-gray-500">
                          {quote.detail.lines
                            .filter((l) => l.currentRate !== l.publicRate)
                            .map((l, i) => (
                              <div key={i}>
                                {l.name}: booked at {fmt(l.publicRate)} a night, today’s rate is {fmt(l.currentRate)}.
                              </div>
                            ))}
                        </div>
                      )}

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
                    {rooms.map((r, i) => {
                      const plan = planOf(r.id)
                      return (
                        <div key={i} className="flex justify-between text-sm gap-4">
                          <span className="text-gray-700">
                            {r.name}
                            {plan?.planName && (
                              <span className="text-gray-400">
                                {' · '}
                                {plan.planCode && <span className="font-mono text-xs">{plan.planCode}</span>}
                                {plan.planCode ? ' ' : ''}{plan.planName}
                              </span>
                            )}
                          </span>
                          <span className="text-gray-500 whitespace-nowrap">{fmt(r.claytonRate)} / night</span>
                        </div>
                      )
                    })}
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
