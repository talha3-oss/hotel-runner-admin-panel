'use client'

// The bookings as a month, not a list.
//
// A list answers "what came in last"; a calendar answers "who is here on the
// 14th", which is the question anyone standing at a front desk is actually
// asking. The two read the same bookings from the same endpoint -- the
// calendar just asks for a whole month of them at once.

import Link from 'next/link'
import { BookingRecord } from '../../../lib/api'
import { STATUS_DOTS } from './shared'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** YYYY-MM-DD for a local date, built by hand.
 *
 *  toISOString() would answer in UTC, which in Jordan is three hours behind:
 *  every date before 03:00 would come out as the day before. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The first and last day of a month, as the endpoint wants them. */
export function monthWindow(year: number, month: number) {
  return { from: dayKey(new Date(year, month, 1)), to: dayKey(new Date(year, month + 1, 0)) }
}

type Props = {
  year: number
  month: number
  bookings: BookingRecord[]
  loading: boolean
  onMove: (delta: number) => void
  onToday: () => void
  onPickDay: (day: string) => void
}

export default function BookingsCalendar({
  year, month, bookings, loading, onMove, onToday, onPickDay,
}: Props) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // getDay() counts from Sunday; the grid starts on Monday.
  const lead = (first.getDay() + 6) % 7
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7

  // A guest is in the hotel on the nights from check-in up to, but not
  // including, check-out -- so a one-night stay appears once, on the night
  // they slept there, and not again on the morning they left.
  const staysOn = (day: string) =>
    bookings.filter((b) => b.checkIn <= day && day < b.checkOut)

  const today = dayKey(new Date())

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
          <button onClick={() => onMove(-1)} className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50">← Previous</button>
          <button onClick={onToday} className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50">Today</button>
          <button onClick={() => onMove(1)} className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50">Next →</button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-gray-500">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: cells }, (_, i) => {
          const dayNumber = i - lead + 1
          const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth
          if (!inMonth) {
            return <div key={i} className="min-h-[104px] border-b border-r border-gray-100 bg-gray-50/60" />
          }
          const day = dayKey(new Date(year, month, dayNumber))
          const stays = staysOn(day)
          const shown = stays.slice(0, 3)

          return (
            <div key={i} className="min-h-[104px] border-b border-r border-gray-100 p-1.5 align-top">
              <button
                onClick={() => onPickDay(day)}
                title="Show this day in the list"
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors ${
                  day === today ? 'bg-primary-600 font-semibold text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {dayNumber}
              </button>

              <div className="space-y-1">
                {shown.map((b) => (
                  <Link
                    key={b.id}
                    href={`/dashboard/bookings/${encodeURIComponent(b.bookingRef)}`}
                    title={`${b.firstName} ${b.lastName} · ${b.bookingRef} · ${b.checkIn} → ${b.checkOut}`}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-gray-100 ${
                      b.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOTS[b.status] || 'bg-gray-300'}`} />
                    {/* Arriving today reads differently from still being here,
                        and that is the whole of a front desk's morning. */}
                    <span className={`truncate ${b.checkIn === day ? 'font-semibold' : ''}`}>
                      {b.firstName} {b.lastName}
                    </span>
                  </Link>
                ))}
                {stays.length > shown.length && (
                  <button
                    onClick={() => onPickDay(day)}
                    className="px-1.5 text-[11px] text-primary-600 hover:underline"
                  >
                    +{stays.length - shown.length} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Cancelled</span>
        <span className="ml-auto">A name in bold arrives that day. Click a date to see it in the list.</span>
      </div>
    </div>
  )
}
