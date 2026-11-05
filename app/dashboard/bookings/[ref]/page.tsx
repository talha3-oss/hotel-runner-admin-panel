'use client'

// One booking, in full.
//
// This was a modal on the list, and it had outgrown one: a guest, a stay, the
// rooms with who is in each of them, extras, the money, RateTiger's state,
// and an editor that changes all of it -- in a column you had to scroll to
// read. A booking also has a reference an admin says out loud, so it should
// have an address they can send to somebody.

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import {
  fetchAdminBooking, updateBookingStatus, fetchAdminRooms, fetchAdminRoomTypes,
  previewBookingChange, applyBookingChange, fetchHotels,
  BookingRecord, BookingChange, BookingChangeQuote, Hotel,
} from '../../../../lib/api'
import { formatMoney } from '../../../../lib/currency'
import {
  STATUS_COLORS, RT_LABELS, RT_COLORS, RT_HINTS, API_BASE_URL,
  fmtDate, partyPerRoom, partyLabel, RoomParty,
} from '../shared'

const fmt = formatMoney

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
        {aside}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

export default function BookingPage() {
  const params = useParams<{ ref: string }>()
  const router = useRouter()
  const ref = decodeURIComponent(String(params?.ref || ''))

  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [statusUpdating, setStatusUpdating] = useState(false)
  const [rtSending, setRtSending] = useState(false)
  const [rtResult, setRtResult] = useState<{ ok: boolean; text: string } | null>(null)

  // Changing the booking. Nothing is written until Apply, and the quote is
  // what Apply sends -- so the figure approved is the figure stored.
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<BookingChange>({})
  const [quote, setQuote] = useState<BookingChangeQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [applying, setApplying] = useState(false)

  // A Room row is one (room, rate plan) pair, so the same room appears once
  // per plan under the same name and code.
  const [roomOptions, setRoomOptions] = useState<
    { id: string; name: string; roomNumber: string; planName: string; planCode: string }[]
  >([])

  // What one room at this property holds, so an over-filled room says so
  // while the admin is typing rather than after pressing Check.
  const [roomLimits, setRoomLimits] = useState({ adults: 2, underSix: 2, olderChildren: 2, persons: 3 })
  const [adultMinAge, setAdultMinAge] = useState(13)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    try {
      const result = await fetchAdminBooking(token, ref)
      if (result?.success && result.booking) setBooking(result.booking)
      else setError(result?.message || 'Booking not found.')
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setLoading(false)
    }
  }, [ref])

  useEffect(() => { load() }, [load])

  const loadRooms = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    try {
      const [roomsResult, typesResult] = await Promise.all([
        fetchAdminRooms(token, { limit: '200' }),
        fetchAdminRoomTypes(token),
      ])
      const codes = new Map<string, string>()
      for (const t of (typesResult?.roomTypes || typesResult?.data || []) as { name: string; key?: string }[]) {
        const name = String(t.name || '').trim().toLowerCase()
        const key = String(t.key || '').trim()
        if (!name || !key) continue
        const existing = codes.get(name)
        if (!existing || key.length < existing.length) codes.set(name, key)
      }
      setRoomOptions(
        ((roomsResult?.rooms || roomsResult?.data || []) as { id: string; name: string; roomNumber?: string; roomType?: string }[])
          .map((r) => ({
            id: r.id,
            name: r.name,
            roomNumber: String(r.roomNumber || ''),
            planName: String(r.roomType || ''),
            planCode: codes.get(String(r.roomType || '').trim().toLowerCase()) || '',
          }))
      )
    } catch {
      /* the dropdown falls back to ids */
    }
  }, [])

  useEffect(() => { loadRooms() }, [loadRooms])

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token || !booking?.hotelId) return
    let live = true
    fetchHotels(token)
      .then((result) => {
        if (!live) return
        const hotel = ((result?.hotels || result?.data || []) as Hotel[]).find((h) => h.id === booking.hotelId)
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
        setAdultMinAge(whole(hotel.adultMinAge, 13, 1))
      })
      .catch(() => {})
    return () => { live = false }
  }, [booking?.hotelId])

  const planOf = (roomId: string) => roomOptions.find((r) => r.id === roomId)

  const rooms = Array.isArray(booking?.rooms)
    ? (booking!.rooms as { id: string; name: string; publicRate: number; claytonRate: number }[])
    : []
  const extras = Array.isArray(booking?.extras)
    ? (booking!.extras as { name: string; price: number; total: number }[])
    : []

  // Who is in which room. Recorded on the booking since 2026-11-05; spread
  // evenly for older ones, which the page labels as the guess it is.
  const party = booking ? partyPerRoom(booking, rooms.length) : { rooms: [] as RoomParty[], recorded: true }

  const changeStatus = async (next: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token || !booking) return
    setStatusUpdating(true)
    try {
      const result = await updateBookingStatus(token, booking.id, next)
      if (result.success) setBooking({ ...booking, status: next })
      else alert(result.message || 'Failed to update status.')
    } catch {
      alert('Unable to connect to server.')
    } finally {
      setStatusUpdating(false)
    }
  }

  // Sent in the background on a real booking, so without this there is
  // nothing to press and nothing to read but a badge.
  const sendToRateTiger = async (resStatus = 'Commit') => {
    if (!booking) return
    setRtSending(true)
    setRtResult(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/ratetiger-reservation/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: booking.id, resStatus }),
      }).then((r) => r.json())

      setRtResult(
        res.success
          ? { ok: true, text: res.resId ? `Delivered. Their reference: ${res.resId}` : 'Delivered to RateTiger.' }
          : { ok: false, text: res.reason || res.message || 'RateTiger did not accept it.' }
      )
      if (res.booking) setBooking((prev) => (prev ? { ...prev, ...res.booking } : prev))
    } catch {
      setRtResult({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setRtSending(false)
    }
  }

  // ── Changing it ──────────────────────────────────────────────────────────

  const openEditor = () => {
    if (!booking) return
    setQuote(null)
    setForm({
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomIds: rooms.map((r) => r.id),
      roomOccupancy: party.rooms,
      firstName: booking.firstName, lastName: booking.lastName,
      email: booking.email, phone: booking.phone,
    })
    setEditing(true)
  }

  const closeEditor = () => { setEditing(false); setQuote(null); setForm({}) }

  // The rooms are what the admin edits; the totals are read off them, so the
  // two can never disagree about who is staying.
  const layout = form.roomOccupancy || []
  const totals = {
    adults: layout.reduce((sum, r) => sum + r.adults, 0),
    underSix: layout.reduce((sum, r) => sum + r.underSix, 0),
    olderChildren: layout.reduce((sum, r) => sum + r.olderChildren, 0),
  }

  const setRoomCount = (index: number, key: keyof RoomParty, value: number) => {
    const floor = key === 'adults' ? 1 : 0
    setForm({
      ...form,
      roomOccupancy: layout.map((room, i) =>
        i === index ? { ...room, [key]: Math.max(floor, Math.floor(Number(value) || 0)) } : room
      ),
    })
    setQuote(null)
  }

  const roomProblem = (room: RoomParty) => {
    const people = room.adults + room.underSix + room.olderChildren
    if (room.adults > roomLimits.adults) return `${room.adults} adults — a room here takes ${roomLimits.adults}.`
    if (room.olderChildren > roomLimits.olderChildren) return `${room.olderChildren} children of 6–${adultMinAge - 1} — a room here takes ${roomLimits.olderChildren}.`
    if (room.underSix > roomLimits.underSix) return `${room.underSix} under 6 — a room here takes ${roomLimits.underSix}.`
    if (people > roomLimits.persons) return `${people} people — a room here takes ${roomLimits.persons}.`
    return null
  }

  const changePayload = (): BookingChange => ({
    ...form,
    adults: Math.max(1, totals.adults),
    childrenAges: [
      ...Array(totals.underSix).fill('under6'),
      ...Array(totals.olderChildren).fill('6-12'),
    ],
  })

  const runQuote = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token || !booking) return
    setQuoting(true)
    try {
      setQuote(await previewBookingChange(token, booking.id, changePayload()))
    } catch {
      setQuote({ success: false, message: 'Unable to reach the server.' })
    } finally {
      setQuoting(false)
    }
  }

  const runApply = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token || !booking) return
    setApplying(true)
    try {
      const result = await applyBookingChange(token, booking.id, changePayload())
      if (result.success) { setBooking(result.booking); closeEditor() }
      else setQuote({ success: false, message: result.message || 'The change was refused.' })
    } catch {
      setQuote({ success: false, message: 'Unable to reach the server.' })
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="p-8">
        <Link href="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeftIcon className="h-4 w-4" /> Bookings
        </Link>
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Booking not found.'}
        </p>
      </div>
    )
  }

  const nights = Math.max(1, booking.nights || 1)

  return (
    <div className="p-6 lg:p-8">
      {/* ── Header ── */}
      <Link href="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeftIcon className="h-4 w-4" /> Bookings
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold text-gray-900">{booking.bookingRef}</h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Invoice: {booking.invoice?.invoiceRef || '—'} · Booked on {fmtDate(booking.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
            {booking.status}
          </span>
          <select
            value={booking.status}
            disabled={statusUpdating}
            onChange={(e) => changeStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {booking.status !== 'CANCELLED' && !editing && (
            <button
              onClick={openEditor}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Change booking
            </button>
          )}
        </div>
      </div>

      {/* ── Changing it ──
          Full width, because the rooms are a table and a table in a column
          is a column of tables. */}
      {editing && (
        <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Change booking</h2>
            <button onClick={closeEditor} className="text-xs text-gray-500 hover:text-gray-800">Cancel</button>
          </div>

          <div className="space-y-5 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-gray-600">
                Check-in
                <input
                  type="date" value={form.checkIn || ''}
                  onChange={(e) => { setForm({ ...form, checkIn: e.target.value }); setQuote(null) }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Check-out
                <input
                  type="date" value={form.checkOut || ''}
                  onChange={(e) => { setForm({ ...form, checkOut: e.target.value }); setQuote(null) }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              {([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone']] as const).map(([key, label]) => (
                <label key={key} className="text-xs text-gray-600">
                  {label}
                  <input
                    value={(form[key] as string) || ''}
                    onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setQuote(null) }}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>

            {/* The rule is applied to each room on its own -- an empty place
                in one room is no use to a child sleeping in another -- so the
                party is edited here and the totals are read off it. */}
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-medium text-gray-700">Rooms and who is in them</h3>
                <p className="text-[11px] text-gray-400">
                  a room here takes {roomLimits.adults} adults, {roomLimits.underSix} under 6,{' '}
                  {roomLimits.olderChildren} aged 6–{adultMinAge - 1}, {roomLimits.persons} people in all
                </p>
              </div>

              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] gap-2 text-[11px] text-gray-400">
                  <span>Room</span><span>Adults</span><span>Under 6</span><span>6–{adultMinAge - 1}</span><span />
                </div>

                {(form.roomIds || []).map((id, i) => {
                  const room = layout[i] || { adults: 1, underSix: 0, olderChildren: 0 }
                  const problem = roomProblem(room)
                  return (
                    <div key={`${id}-${i}`}>
                      <div className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] gap-2">
                        <select
                          value={id}
                          onChange={(e) => {
                            const next = [...(form.roomIds || [])]
                            next[i] = e.target.value
                            setForm({ ...form, roomIds: next }); setQuote(null)
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          {roomOptions.length === 0 && <option value={id}>{id}</option>}
                          {roomOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.roomNumber} — {r.name}
                              {r.planName ? ` · ${r.planCode ? `${r.planCode} ` : ''}${r.planName}` : ''}
                            </option>
                          ))}
                        </select>

                        {([['adults', room.adults, 1], ['underSix', room.underSix, 0], ['olderChildren', room.olderChildren, 0]] as const).map(
                          ([key, value, floor]) => (
                            <input
                              key={key}
                              type="number"
                              min={floor}
                              value={value}
                              onChange={(e) => setRoomCount(i, key, Number(e.target.value))}
                              className={`rounded-md border px-2 py-1.5 text-sm ${problem ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                            />
                          )
                        )}

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
                          className="rounded px-2 text-xs text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent"
                        >
                          Remove
                        </button>
                      </div>
                      {problem && <p className="mt-0.5 text-[11px] text-amber-700">Room {i + 1}: {problem}</p>}
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
                <span className="text-[11px] text-gray-500">{partyLabel(totals, adultMinAge)}</span>
              </div>
            </div>

            <button
              onClick={runQuote}
              disabled={quoting}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {quoting ? 'Checking…' : 'Check what this costs'}
            </button>

            {quote && !quote.success && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{quote.message}</div>
            )}

            {quote?.success && quote.after && quote.before && (
              <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-gray-400">&nbsp;</div>
                  <div className="font-medium text-gray-400">Now</div>
                  <div className="font-medium text-gray-400">After</div>

                  <div className="text-gray-500">Dates</div>
                  <div className="text-gray-700">{quote.before.checkIn} → {quote.before.checkOut}</div>
                  <div className="font-medium text-gray-900">{quote.after.checkIn} → {quote.after.checkOut}</div>

                  <div className="text-gray-500">Nights</div>
                  <div className="text-gray-700">{quote.before.nights}</div>
                  <div className="font-medium text-gray-900">{quote.after.nights}</div>

                  <div className="text-gray-500">Rooms</div>
                  <div className="text-gray-700">{quote.before.rooms?.length ?? 0}</div>
                  <div className="font-medium text-gray-900">{quote.after.rooms.length}</div>

                  <div className="text-gray-500">Total</div>
                  <div className="text-gray-700">{fmt(quote.before.total)}</div>
                  <div className="font-semibold text-gray-900">{fmt(quote.after.total)}</div>
                </div>

                {quote.detail && (
                  <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
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
                    {quote.detail.lines.filter((l) => l.currentRate !== l.publicRate).map((l, i) => (
                      <div key={i}>{l.name}: booked at {fmt(l.publicRate)} a night, today’s rate is {fmt(l.currentRate)}.</div>
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
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {quote.blocked.map((b, i) => <div key={i}>{b}</div>)}
                  </div>
                ) : (
                  <button
                    onClick={runApply}
                    disabled={applying}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {applying ? 'Applying…' : 'Apply this change'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* ── Left: who and when ── */}
        <div className="space-y-5">
          <Section title="Guest">
            <p className="text-sm font-semibold text-gray-900">{booking.firstName} {booking.lastName}</p>
            <p className="mt-1 text-sm text-gray-500">{booking.email}</p>
            <p className="text-sm text-gray-500">{booking.phone}</p>
          </Section>

          <Section title="Stay">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Hotel" value={booking.hotelName} />
              <Field label="Nights" value={nights} />
              <Field label="Check-in" value={booking.checkIn} />
              <Field label="Check-out" value={booking.checkOut} />
              <div className="col-span-2">
                <Field
                  label="Guests"
                  value={partyLabel(
                    {
                      adults: booking.adults,
                      underSix: party.rooms.reduce((s, r) => s + r.underSix, 0),
                      olderChildren: party.rooms.reduce((s, r) => s + r.olderChildren, 0),
                    },
                    adultMinAge
                  )}
                />
              </div>
            </dl>
          </Section>

          <Section title="Payment">
            <dl className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Public rate total</span><span>{fmt(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Luxotel saving</span><span>−{fmt(booking.discount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                <span>Total</span><span>{fmt(booking.total)}</span>
              </div>
              <p className="pt-1 text-xs text-gray-400">
                {booking.paymentMethod === 'hotel' ? 'Pay at hotel' : 'Paid online'} · {booking.paymentStatus}
              </p>
            </dl>
          </Section>
        </div>

        {/* ── Right: the rooms and everything about them ── */}
        <div className="space-y-5 lg:col-span-2">
          <Section
            title="Rooms and who is in them"
            aside={
              !party.recorded && rooms.length > 0 ? (
                <span className="text-[11px] text-amber-600">
                  Booked before this was recorded — shown spread evenly
                </span>
              ) : null
            }
          >
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-400">No rooms on this booking.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {rooms.map((room, i) => {
                  const plan = planOf(room.id)
                  const here = party.rooms[i]
                  return (
                    <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          <span className="text-gray-400">{i + 1}.</span> {room.name}
                        </p>
                        {plan?.planName && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {plan.planCode && <span className="font-mono">{plan.planCode}</span>}
                            {plan.planCode ? ' · ' : ''}{plan.planName}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{here ? partyLabel(here, adultMinAge) : '—'}</p>
                      <p className="whitespace-nowrap text-sm text-gray-500">
                        {fmt(room.claytonRate)} / night
                        <span className="text-gray-300"> · </span>
                        <span className="text-gray-400">{fmt(room.claytonRate * nights)} for the stay</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {extras.length > 0 && (
            <Section title="Extras">
              <div className="space-y-1">
                {extras.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{e.name}</span>
                    <span className="text-gray-500">{fmt(e.total || e.price)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {booking.rateTigerStatus && (
            <Section
              title="RateTiger"
              aside={
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RT_COLORS[booking.rateTigerStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {RT_LABELS[booking.rateTigerStatus] || booking.rateTigerStatus}
                </span>
              }
            >
              <p className="text-xs text-gray-500">{RT_HINTS[booking.rateTigerStatus] || ''}</p>
              {booking.rateTigerResId && (
                <p className="mt-1 text-xs text-gray-400">
                  Their reference: <span className="font-mono">{booking.rateTigerResId}</span>
                </p>
              )}
              {booking.rateTigerSentAt && (
                <p className="mt-1 text-xs text-gray-400">Delivered {fmtDate(booking.rateTigerSentAt)}</p>
              )}
              {booking.rateTigerLastError && booking.rateTigerStatus !== 'SENT' && (
                <p className="mt-1 break-words text-xs text-red-600">{booking.rateTigerLastError}</p>
              )}
              {(booking.rateTigerAttempts ?? 0) > 1 && (
                <p className="mt-1 text-xs text-gray-400">{booking.rateTigerAttempts} attempts</p>
              )}

              {rtResult && (
                <div className={`mt-2 rounded-md px-3 py-2 text-xs ${rtResult.ok ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                  {rtResult.text}
                </div>
              )}

              {booking.rateTigerStatus !== 'SKIPPED' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => sendToRateTiger('Commit')}
                    disabled={rtSending}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {rtSending ? 'Sending…' : booking.rateTigerStatus === 'SENT' ? 'Send again' : 'Send to RateTiger'}
                  </button>
                  {booking.status === 'CANCELLED' && (
                    <button
                      onClick={() => sendToRateTiger('Cancel')}
                      disabled={rtSending}
                      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Send cancellation
                    </button>
                  )}
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
