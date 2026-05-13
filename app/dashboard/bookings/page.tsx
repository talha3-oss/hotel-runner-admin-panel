'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { fetchAdminBookings, updateBookingStatus, BookingRecord } from '../../../lib/api'

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const PAYMENT_COLORS: Record<string, string> = {
  PAID: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-600',
}

function fmt(n: number) {
  return `JOD ${Math.round(n)}`
}

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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No bookings found.</td></tr>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
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
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-700">
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

              <div className="text-xs text-gray-400">Booked on {fmtDate(selectedBooking.createdAt)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
