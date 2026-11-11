'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilSquareIcon,
  ListBulletIcon,
  CalendarDaysIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { fetchAdminBookings, fetchHotels, BookingRecord, Hotel } from '../../../lib/api'
import { formatMoney } from '../../../lib/currency'
import { STATUS_COLORS, PAYMENT_COLORS, RT_LABELS, RT_COLORS, RT_HINTS } from './shared'
import BookingsCalendar, { dayKey, monthWindow } from './BookingsCalendar'

const fmt = formatMoney

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // One property at a time. The list is read hotel by hotel far more often
  // than it is read whole, and searching the name only matched the name as
  // it was typed into the booking.
  const [hotelFilter, setHotelFilter] = useState('')
  const [hotels, setHotels] = useState<Hotel[]>([])
  // A date window on the list, in the same YYYY-MM-DD the bookings are kept
  // in. Empty means no window at all, which is the list as it always was.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  // Two ways of reading the same bookings. The calendar keeps its own month
  // and its own copy, because it asks for a whole month at once while the
  // list asks for a page of fifty.
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [monthBookings, setMonthBookings] = useState<BookingRecord[]>([])
  const [monthLoading, setMonthLoading] = useState(false)

  const load = useCallback(async (
    q = '', s = 'all', p = 1, window: { from?: string; to?: string } = {}, hotel = ''
  ) => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    setError('')
    try {
      const result = await fetchAdminBookings(token, {
        ...(q ? { search: q } : {}),
        ...(s && s !== 'all' ? { status: s } : {}),
        ...(window.from ? { from: window.from } : {}),
        ...(window.to ? { to: window.to } : {}),
        ...(hotel ? { hotelId: hotel } : {}),
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

  useEffect(() => {
    load(search, statusFilter, page, { from, to }, hotelFilter)
  }, [page, load, search, statusFilter, from, to, hotelFilter])

  // The properties to choose between. Loaded once; a hotel that is added
  // while this page is open is one reload away.
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    let live = true
    fetchHotels(token)
      .then((result) => { if (live) setHotels((result?.hotels || result?.data || []) as Hotel[]) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  // The month on screen, every stay that touches it. 500 is the endpoint's
  // own ceiling; a month past it would be a very good problem to have.
  useEffect(() => {
    if (view !== 'calendar') return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    const span = monthWindow(cursor.year, cursor.month)
    let live = true
    setMonthLoading(true)
    fetchAdminBookings(token, {
      ...(search ? { search } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(hotelFilter ? { hotelId: hotelFilter } : {}),
      from: span.from,
      to: span.to,
      page: 1,
      limit: 500,
    })
      .then((result) => { if (live && result.success) setMonthBookings(result.bookings || []) })
      .catch(() => { if (live) setError('Unable to connect to server.') })
      .finally(() => { if (live) setMonthLoading(false) })
    return () => { live = false }
  }, [view, cursor, search, statusFilter, hotelFilter])

  const handleSearch = (v: string) => { setSearch(v); setPage(1); setLoading(true) }
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); setLoading(true) }
  const handleHotelFilter = (v: string) => { setHotelFilter(v); setPage(1); setLoading(true) }
  const handleFrom = (v: string) => { setFrom(v); setPage(1); setLoading(true) }
  const handleTo = (v: string) => { setTo(v); setPage(1); setLoading(true) }

  const clearDates = () => { setFrom(''); setTo(''); setPage(1); setLoading(true) }

  // Clicking a date in the calendar is a question about that one day, and the
  // list is where a day is read in full.
  const pickDay = (day: string) => {
    setFrom(day)
    setTo(day)
    setPage(1)
    setLoading(true)
    setView('list')
  }

  const thisMonth = () => {
    const now = new Date()
    setFrom(dayKey(new Date(now.getFullYear(), now.getMonth(), 1)))
    setTo(dayKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    setPage(1)
    setLoading(true)
  }

  const totalPages = Math.ceil(total / limit)
  const displayName = (b: BookingRecord) => `${b.firstName} ${b.lastName}`
  const dated = Boolean(from || to)

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          {/* The list's count is a count of matches; the calendar's is a
              count of stays in the month on screen. Showing the list's
              number above a calendar was simply the wrong answer. */}
          <p className="mt-1 text-sm text-gray-600">
            {view === 'calendar'
              ? `${monthBookings.length} stay${monthBookings.length !== 1 ? 's' : ''} this month`
              : `${total} total booking${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
        <Link
          href="/dashboard/bookings/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4" />
          New booking
        </Link>

        <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ListBulletIcon className="h-4 w-4" /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === 'calendar' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <CalendarDaysIcon className="h-4 w-4" /> Calendar
          </button>
        </div>
        </div>
      </div>

      {/* Filters */}
      {/* One row, and wrapping below the width where one row fits.
          What used to break it on a desktop was the search box reserving
          24rem it did not need and the words "Staying between" taking as
          much room as a date -- the dates say what they are.
          The seven controls need about 960px between them before the search
          box is down to something anybody can type in, so 1400 is where the
          row holds; below that they wrap rather than being squeezed. */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center min-[1400px]:flex-nowrap">
        <div className="relative flex-1 min-w-[11rem] sm:max-w-sm lg:max-w-none">
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
          className="shrink-0 w-36 border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={hotelFilter}
          onChange={(e) => handleHotelFilter(e.target.value)}
          /* Fixed, because a hotel called "Luxotel Aqaba Beach Resort & Spa
             15+" would otherwise set the width of the whole bar. */
          className="shrink-0 w-44 border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All hotels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        {/* Stays touching these days, so a guest already in the hotel on the
            first of them still counts. */}
        {view === 'list' && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm text-gray-500 min-[1400px]:flex-nowrap">
            {/* The words were "Staying between" and took as much of the row
                as one of the dates. The icon carries it, and the title says
                it for anyone who hovers or uses a screen reader. */}
            <CalendarDaysIcon
              className="h-5 w-5 shrink-0 text-gray-400"
              title="Staying between"
              aria-label="Staying between"
            />
            <input
              type="date"
              value={from}
              onChange={(e) => handleFrom(e.target.value)}
              aria-label="Staying from"
              className="w-[8.75rem] shrink-0 border border-gray-300 rounded-md text-sm px-2 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="shrink-0 text-gray-400">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => handleTo(e.target.value)}
              aria-label="Staying to"
              className="w-[8.75rem] shrink-0 border border-gray-300 rounded-md text-sm px-2 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={thisMonth} className="shrink-0 whitespace-nowrap rounded border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50">This month</button>
            {dated && (
              <button onClick={clearDates} className="shrink-0 whitespace-nowrap rounded border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Clear</button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {view === 'calendar' ? (
        <BookingsCalendar
          year={cursor.year}
          month={cursor.month}
          bookings={monthBookings}
          loading={monthLoading}
          onMove={(delta) => setCursor((c) => {
            const d = new Date(c.year, c.month + delta, 1)
            return { year: d.getFullYear(), month: d.getMonth() }
          })}
          onToday={() => { const now = new Date(); setCursor({ year: now.getFullYear(), month: now.getMonth() }) }}
          onPickDay={pickDay}
        />
      ) : (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {dated && !loading && (
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-2 text-xs text-gray-500">
            Showing stays that touch {from || 'any date'} → {to || 'any date'}, earliest arrival first.
          </div>
        )}
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
                      <div className="inline-flex items-center gap-3">
                        {/* Its own page, not a panel over this one: a booking
                            has an address an admin can send to somebody, and
                            the back button takes them to this list. */}
                        <Link
                          href={`/dashboard/bookings/${encodeURIComponent(b.bookingRef)}`}
                          className="text-gray-400 transition-colors hover:text-primary-600"
                          title="View details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        {/* The same page with its editor already open. A
                            cancelled booking has nothing to change. */}
                        {b.status !== 'CANCELLED' && (
                          <Link
                            href={`/dashboard/bookings/${encodeURIComponent(b.bookingRef)}?edit=1`}
                            className="text-gray-400 transition-colors hover:text-primary-600"
                            title="Change this booking"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </Link>
                        )}
                      </div>
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
      )}

    </div>
  )
}
