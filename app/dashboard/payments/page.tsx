'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CurrencyPoundIcon,
} from '@heroicons/react/24/outline'
import { fetchAdminBookings, BookingRecord } from '../../../lib/api'
import { formatMoneyExact } from '../../../lib/currency'

// Loaded only when the tab is opened. It talks to the bank on mount, and
// most visits to this screen are to look at bookings.
const UnmatchedPayments = dynamic(() => import('../../../components/UnmatchedPayments'), { ssr: false })

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
}

const fmtCurrency = formatMoneyExact

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function methodLabel(method: string) {
  if (!method) return 'Unknown'
  if (method === 'now') return 'Pay Now'
  if (method === 'hotel') return 'Pay at Hotel'
  return method
}

function methodIcon(method: string) {
  if (method === 'hotel') return <BanknotesIcon className="h-4 w-4 text-green-500" />
  return <CreditCardIcon className="h-4 w-4 text-blue-500" />
}

function statusIcon(status: string) {
  if (status === 'PAID') return <CheckCircleIcon className="h-4 w-4 text-green-500" />
  if (status === 'PENDING') return <ClockIcon className="h-4 w-4 text-yellow-500" />
  return <XCircleIcon className="h-4 w-4 text-red-500" />
}

export default function PaymentsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<BookingRecord | null>(null)
  const [tab, setTab] = useState<'bookings' | 'unmatched'>('bookings')
  const limit = 20

  const load = useCallback(async (q: string, status: string, p: number) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const result = await fetchAdminBookings(token, {
        ...(q ? { search: q } : {}),
        ...(status !== 'all' ? { status } : {}),
        page: p,
        limit,
      })
      if (result?.success) {
        setBookings(result.bookings || [])
        setTotal(result.total || 0)
      } else {
        setError(result?.message || 'Failed to load payments.')
      }
    } catch {
      setError('Could not reach server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(search, statusFilter, page) }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(search, statusFilter, 1)
  }

  const filtered = methodFilter === 'all'
    ? bookings
    : bookings.filter(b => {
        if (methodFilter === 'now') return b.paymentMethod === 'now'
        if (methodFilter === 'hotel') return b.paymentMethod === 'hotel'
        return true
      })

  const paid = bookings.filter(b => b.paymentStatus === 'PAID')
  const pending = bookings.filter(b => b.paymentStatus === 'PENDING')
  const totalRevenue = paid.reduce((s, b) => s + (b.total || 0), 0)
  const pendingRevenue = pending.reduce((s, b) => s + (b.total || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          {tab === 'bookings'
            ? 'All payment records derived from bookings.'
            : 'What the bank has actually taken, whether a booking belongs to it or not.'}
        </p>
      </div>

      {/* Two different questions, so two tabs. The first is "what did this
          guest pay"; the second is "is the bank holding anything we have
          not accounted for", which used to be a button in Settings and
          belongs here beside the money it is about. */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([['bookings', 'Payments'], ['unmatched', 'Unmatched & refunds']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`whitespace-nowrap border-b-2 py-3 text-sm font-medium ${
                tab === key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'unmatched' && <UnmatchedPayments />}

      {tab === 'bookings' && (<>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Collected Revenue', value: fmtCurrency(totalRevenue), icon: CurrencyPoundIcon, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Paid Bookings', value: paid.length.toString(), icon: CheckCircleIcon, color: 'bg-green-50 text-green-600' },
          { label: 'Pending Revenue', value: fmtCurrency(pendingRevenue), icon: ClockIcon, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Pending Payments', value: pending.length.toString(), icon: BanknotesIcon, color: 'bg-orange-50 text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search booking ref, guest name, email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); load(search, e.target.value, 1) }}
          >
            <option value="all">All Status</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
          >
            <option value="all">All Methods</option>
            <option value="now">Pay Now</option>
            <option value="hotel">Pay at Hotel</option>
          </select>
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {['Booking Ref', 'Guest', 'Hotel', 'Amount', 'Method', 'Payment Status', 'Booking Status', 'Date', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">No payment records found.</td></tr>
              )}
              {!loading && filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">{b.bookingRef}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{b.firstName} {b.lastName}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500 max-w-[140px] truncate">{b.hotelName}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{fmtCurrency(b.total)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      {methodIcon(b.paymentMethod)}
                      {methodLabel(b.paymentMethod)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(b.paymentStatus)}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_STATUS_STYLES[b.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {b.paymentStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      b.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{fmtDate(b.createdAt)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => setSelected(b)}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => { const p = page - 1; setPage(p); load(search, statusFilter, p) }}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >Prev</button>
              <button
                disabled={page * limit >= total}
                onClick={() => { const p = page + 1; setPage(p); load(search, statusFilter, p) }}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      </>)}

      {/* Detail modal */}
      {selected && (
        // A fixed box on a short laptop screen ran off both ends and took
        // the last rows -- the bank's references, which are the reason
        // this opens at all -- out of reach of any scroll. It is a column
        // now: a header and a Close that stay put, and only the figures
        // between them move.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Payment Detail</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-4 text-sm overflow-y-auto px-6 py-5">
              {[
                ['Booking Ref', selected.bookingRef],
                ['Guest', `${selected.firstName} ${selected.lastName}`],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['Hotel', selected.hotelName],
                ['Check-in / Check-out', `${selected.checkIn} → ${selected.checkOut}`],
                ['Nights', selected.nights],
                ['Adults / Children', `${selected.adults} / ${selected.children}`],
                ['Subtotal', fmtCurrency(selected.subtotal)],
                ['Discount', fmtCurrency(selected.discount)],
                // Shown only when there was one, and named, so the figures
                // above and below it add up on the page somebody is reading
                // when they ask why a payment is short.
                ...(Number(selected.couponAmount) > 0
                  ? [[`Coupon${selected.couponCode ? ` ${selected.couponCode}` : ''}`, fmtCurrency(Number(selected.couponAmount))] as [string, string]]
                  : []),
                ['Total', fmtCurrency(selected.total)],
                ['Payment Method', methodLabel(selected.paymentMethod)],
                ['Payment Status', selected.paymentStatus],
                ['Booking Status', selected.status],
                ['Date', fmtDate(selected.createdAt)],

                // What the bank holds, for anyone checking this booking
                // against the bank's own dashboard. The two references are
                // the only way to do that by hand: theirs finds the
                // transaction, ours is what they print as the Merchant
                // Reference Number. Shown only for a booking that went
                // through the gateway -- one taken at the desk has none of
                // this and a row of dashes helps nobody.
                ...(selected.paymentRef
                  ? ([
                      ['Transaction ID', selected.paymentRef],
                      ...(selected.paymentMerchantRef ? [['Merchant Reference', selected.paymentMerchantRef]] : []),
                      ...(selected.paymentAmount != null
                        ? [['Charged by bank', `${selected.paymentAmount} ${selected.paymentCurrency || ''}`.trim()]]
                        : []),
                      ...(selected.paymentCardLast4
                        ? [['Card', `${selected.paymentCardBrand || 'Card'} •••• ${selected.paymentCardLast4}`]]
                        : []),
                      ...(selected.paymentApprovalCode ? [['Approval Code', selected.paymentApprovalCode]] : []),
                    ] as [string, string][])
                  : []),
              ].map(([label, value]) => {
                // The references are read off the screen and typed into
                // the bank's search box, so they are set in a monospaced
                // face where a 0 cannot be taken for an O.
                const code = label === 'Transaction ID' || label === 'Merchant Reference' || label === 'Approval Code'
                return (
                  <div key={String(label)} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
                    <span className="text-gray-500 flex-shrink-0">{label}</span>
                    <span className={`text-gray-900 text-right break-all ${code ? 'font-mono text-xs pt-0.5' : 'font-medium'}`}>
                      {String(value)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
