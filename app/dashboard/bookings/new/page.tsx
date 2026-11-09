'use client'

// A booking written down by an admin: the guest rang up, or is standing at
// the desk.
//
// Deliberately the same form as the editor on a booking's own page -- the
// same room picker, the same who-is-in-which-room table, the same two steps
// of quote-then-commit. The only parts that are new here are choosing the
// property and the guest's details, because an existing booking already has
// both.
//
// Nothing is guessed on this side: the server prices the stay, refuses rooms
// that are not on sale, and tells RateTiger. What is shown under "Check what
// this costs" is what gets written.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import {
  fetchAdminRooms, fetchAdminRoomTypes, fetchHotels,
  quoteNewBooking, createManualBooking,
  BookingChangeQuote, Hotel,
} from '../../../../lib/api'
import { formatMoney } from '../../../../lib/currency'
import { RoomParty } from '../shared'
import { RoomLines, RoomOption, RoomLimits } from '../RoomPicker'

const fmt = formatMoney

/** Tomorrow and the day after, in the YYYY-MM-DD the booking is kept in.
 *  A stay that starts today is the unusual one. */
const dayAfter = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function NewBookingPage() {
  const router = useRouter()

  const [hotels, setHotels] = useState<Hotel[]>([])
  const [hotelId, setHotelId] = useState('')
  const [allRooms, setAllRooms] = useState<RoomOption[]>([])

  const [guest, setGuest] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [checkIn, setCheckIn] = useState(dayAfter(1))
  const [checkOut, setCheckOut] = useState(dayAfter(2))
  const [paymentMethod, setPaymentMethod] = useState<'hotel' | 'now'>('hotel')
  const [sendEmail, setSendEmail] = useState(true)

  const [roomIds, setRoomIds] = useState<string[]>([])
  const [occupancy, setOccupancy] = useState<RoomParty[]>([])

  const [limits, setLimits] = useState<RoomLimits>({ adults: 2, underSix: 2, olderChildren: 2, persons: 3 })
  const [adultMinAge, setAdultMinAge] = useState(13)

  const [quote, setQuote] = useState<BookingChangeQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Everything the form needs: the properties to choose between, and every
  // room with the plan it is sold on. Rooms are fetched once and filtered
  // per hotel, because switching property should not mean waiting again.
  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); return }
    try {
      const [hotelsResult, roomsResult, typesResult] = await Promise.all([
        fetchHotels(token),
        fetchAdminRooms(token, { limit: '500' }),
        fetchAdminRoomTypes(token),
      ])

      const list = ((hotelsResult?.hotels || hotelsResult?.data || []) as Hotel[])
      setHotels(list)

      const codes = new Map<string, string>()
      for (const t of (typesResult?.roomTypes || typesResult?.data || []) as { name: string; key?: string }[]) {
        const name = String(t.name || '').trim().toLowerCase()
        const key = String(t.key || '').trim()
        if (!name || !key) continue
        const existing = codes.get(name)
        if (!existing || key.length < existing.length) codes.set(name, key)
      }

      setAllRooms(
        ((roomsResult?.rooms || roomsResult?.data || []) as
          { id: string; name: string; roomNumber?: string; roomType?: string; hotelId?: string }[])
          .map((r) => ({
            id: r.id,
            name: r.name,
            roomNumber: String(r.roomNumber || ''),
            planName: String(r.roomType || ''),
            planCode: codes.get(String(r.roomType || '').trim().toLowerCase()) || '',
            hotelId: r.hotelId,
          }))
      )
    } catch {
      setError('Unable to reach the server.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const hotel = hotels.find((h) => h.id === hotelId) || null
  const rooms = allRooms.filter((r) => r.hotelId === hotelId)

  // What one room at this property holds, so an over-filled room says so
  // while the admin is typing rather than after pressing Check.
  useEffect(() => {
    if (!hotel) return
    const whole = (value: unknown, fallback: number, floor: number) => {
      const n = Math.floor(Number(value))
      return Number.isFinite(n) && n >= floor ? n : fallback
    }
    setLimits({
      adults: whole(hotel.maxAdultsPerRoom, 2, 1),
      underSix: whole(hotel.maxUnderSixPerRoom, 2, 0),
      olderChildren: whole(hotel.maxOlderChildrenPerRoom, 2, 0),
      persons: whole(hotel.maxPersonsPerRoom, 3, 1),
    })
    setAdultMinAge(whole(hotel.adultMinAge, 13, 1))
  }, [hotel])

  // A different property is a different set of rooms, so the ones chosen
  // under the old one cannot be carried over.
  const pickHotel = (id: string) => {
    setHotelId(id)
    const first = allRooms.find((r) => r.hotelId === id)
    setRoomIds(first ? [first.id] : [])
    setOccupancy(first ? [{ adults: 2, underSix: 0, olderChildren: 0 }] : [])
    setQuote(null)
  }

  const totals = {
    adults: occupancy.reduce((sum, r) => sum + r.adults, 0),
    underSix: occupancy.reduce((sum, r) => sum + r.underSix, 0),
    olderChildren: occupancy.reduce((sum, r) => sum + r.olderChildren, 0),
  }

  const stay = () => ({
    hotelId,
    checkIn,
    checkOut,
    adults: Math.max(1, totals.adults),
    childrenAges: [
      ...Array(totals.underSix).fill('under6'),
      ...Array(totals.olderChildren).fill('6-12'),
    ],
    roomOccupancy: occupancy,
    roomIds,
  })

  // What is missing before this can be asked about at all. Said plainly
  // rather than by a disabled button with no explanation.
  const missing = (): string | null => {
    if (!hotelId) return 'Choose the hotel first.'
    if (roomIds.length === 0) return 'Add at least one room.'
    if (!checkIn || !checkOut || checkOut <= checkIn) return 'Check-out must be at least one night after check-in.'
    return null
  }

  const incomplete = (): string | null => {
    const first = missing()
    if (first) return first
    if (!guest.firstName.trim() || !guest.lastName.trim()) return 'The guest needs a first and last name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim())) return 'The guest needs a valid email address.'
    if (!guest.phone.trim()) return 'The guest needs a phone number.'
    return null
  }

  const runQuote = async () => {
    const token = localStorage.getItem('adminToken')
    const problem = missing()
    if (!token || problem) { setError(problem || 'Admin token not found.'); return }
    setError('')
    setQuoting(true)
    try {
      setQuote(await quoteNewBooking(token, stay()))
    } catch {
      setQuote({ success: false, message: 'Unable to reach the server.' })
    } finally {
      setQuoting(false)
    }
  }

  const create = async () => {
    const token = localStorage.getItem('adminToken')
    const problem = incomplete()
    if (!token || problem) { setError(problem || 'Admin token not found.'); return }
    setError('')
    setSaving(true)
    try {
      const nights = Math.max(
        1,
        Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)
      )
      const result = await createManualBooking(token, {
        ...stay(),
        hotelName: hotel?.name || '',
        rooms: roomIds.map((id) => ({ id })),
        nights,
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        email: guest.email.trim(),
        phone: guest.phone.trim(),
        paymentMethod,
        sendEmail,
      })
      if (result.success && result.bookingRef) {
        router.push(`/dashboard/bookings/${encodeURIComponent(result.bookingRef)}`)
      } else {
        setError(result.message || 'The booking was refused.')
      }
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const nights = Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000))

  return (
    <div className="p-6 lg:p-8">
      <Link href="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeftIcon className="h-4 w-4" /> Bookings
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-bold text-gray-900">New booking</h1>
        <p className="mt-1 text-sm text-gray-500">
          For a stay taken at the desk or over the telephone. It is priced, checked and sent to
          RateTiger exactly as a booking made on the website.
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50">
        <div className="border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">The stay</h2>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-gray-600 lg:col-span-2">
              Hotel
              <select
                value={hotelId}
                onChange={(e) => pickHotel(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Choose a hotel…</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Check-in
              <input
                type="date" value={checkIn}
                onChange={(e) => { setCheckIn(e.target.value); setQuote(null) }}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600">
              Check-out
              <input
                type="date" value={checkOut}
                onChange={(e) => { setCheckOut(e.target.value); setQuote(null) }}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone']] as const).map(([key, label]) => (
              <label key={key} className="text-xs text-gray-600">
                {label}
                <input
                  value={guest[key]}
                  onChange={(e) => setGuest({ ...guest, [key]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>

          {!hotelId ? (
            <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-400">
              Choose a hotel to pick its rooms.
            </p>
          ) : rooms.length === 0 ? (
            <p className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
              This hotel has no rooms set up yet.
            </p>
          ) : (
            <RoomLines
              roomIds={roomIds}
              occupancy={occupancy}
              options={rooms}
              limits={limits}
              adultMinAge={adultMinAge}
              onChange={(nextRooms, nextParty) => {
                setRoomIds(nextRooms)
                setOccupancy(nextParty)
                setQuote(null)
              }}
            />
          )}

          <div className="flex flex-wrap items-center gap-5">
            <label className="text-xs text-gray-600">
              Payment
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'hotel' | 'now')}
                className="mt-1 block w-48 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="hotel">Pay at the hotel</option>
                <option value="now">Paid already</option>
              </select>
            </label>

            <label className="flex items-center gap-2 pt-4 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              Email the guest their confirmation
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runQuote}
              disabled={quoting}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {quoting ? 'Checking…' : 'Check what this costs'}
            </button>
            {nights > 0 && (
              <span className="text-[11px] text-gray-500">{nights} night{nights !== 1 ? 's' : ''}</span>
            )}
          </div>

          {quote && !quote.success && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{quote.message}</div>
          )}

          {quote?.success && quote.after && (
            <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:grid-cols-4">
                <div className="text-gray-500">Dates</div>
                <div className="font-medium text-gray-900">{quote.after.checkIn} → {quote.after.checkOut}</div>
                <div className="text-gray-500">Nights</div>
                <div className="font-medium text-gray-900">{quote.after.nights}</div>

                <div className="text-gray-500">Rooms</div>
                <div className="font-medium text-gray-900">{quote.after.rooms.length}</div>
                <div className="text-gray-500">Guests</div>
                <div className="font-medium text-gray-900">
                  {quote.after.adults} adult{quote.after.adults !== 1 ? 's' : ''}
                  {quote.after.children > 0 ? `, ${quote.after.children} child${quote.after.children !== 1 ? 'ren' : ''}` : ''}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-2 text-xs">
                {quote.after.rooms.map((r, i) => (
                  <div key={`${r.id}-${i}`} className="flex justify-between py-0.5 text-gray-600">
                    <span>{r.name}</span>
                    <span>{fmt(r.claytonRate)} a night</span>
                  </div>
                ))}
              </div>

              <div className="flex items-baseline justify-between border-t border-gray-100 pt-2">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-base font-semibold text-gray-900">{fmt(quote.after.total)}</span>
              </div>

              {quote.blocked && quote.blocked.length > 0 ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {quote.blocked.map((b, i) => <div key={i}>{b}</div>)}
                </div>
              ) : (
                <>
                  {incomplete() && (
                    <p className="text-[11px] text-amber-700">{incomplete()}</p>
                  )}
                  <button
                    onClick={create}
                    disabled={saving || Boolean(incomplete())}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Creating…' : 'Create this booking'}
                  </button>
                  <p className="text-[11px] text-gray-400">
                    Payment is not taken here — settle it separately.
                    {sendEmail ? ' The guest is emailed their confirmation.' : ' The guest is not emailed.'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
