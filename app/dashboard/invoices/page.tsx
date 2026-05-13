'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { fetchAdminInvoices, InvoiceRecord } from '../../../lib/api'

const INVOICE_STATUS_COLORS: Record<string, string> = {
  ISSUED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

function fmt(n: number) {
  return `JOD ${Math.round(n)}`
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const [selected, setSelected] = useState<InvoiceRecord | null>(null)

  const load = useCallback(async (q = '', p = 1) => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    setError('')
    try {
      const result = await fetchAdminInvoices(token, { ...(q ? { search: q } : {}), page: p, limit })
      if (result.success) {
        setInvoices(result.invoices || [])
        setTotal(result.total || 0)
      } else {
        setError(result.message || 'Failed to load invoices.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(search, page) }, [load, search, page])

  const handleSearch = (v: string) => { setSearch(v); setPage(1); setLoading(true); load(v, 1) }

  const totalPages = Math.ceil(total / limit)
  const b = selected?.booking
  const rooms = Array.isArray(b?.rooms) ? (b!.rooms as { name: string; publicRate: number; claytonRate: number }[]) : []
  const extras = Array.isArray(b?.extras) ? (b!.extras as { name: string; price: number; total: number }[]) : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-1 text-sm text-gray-600">{total} invoice{total !== 1 ? 's' : ''} generated</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice or booking ref, email…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading invoices…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Ref</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No invoices yet.</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-mono text-sm font-semibold text-gray-900">{inv.invoiceRef}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-primary-700">{inv.booking?.bookingRef || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{inv.booking?.firstName} {inv.booking?.lastName}</div>
                      <div className="text-xs text-gray-400">{inv.booking?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inv.booking?.hotelName || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{inv.booking ? fmt(inv.booking.total) : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{fmtDate(inv.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelected(inv)}
                        className="text-gray-400 hover:text-primary-600 transition-colors"
                        title="View invoice"
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

      {/* Invoice detail modal */}
      {selected && b && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Invoice header */}
            <div className="bg-gray-900 px-6 py-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-orange-400 tracking-widest">LUXOTEL</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Invoice</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-lg px-4 py-3 text-center">
                  <p className="text-gray-400 text-xs">Invoice No.</p>
                  <p className="text-white font-bold text-lg mt-0.5">{selected.invoiceRef}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-3 text-center">
                  <p className="text-gray-400 text-xs">Booking Ref.</p>
                  <p className="text-orange-400 font-bold text-lg mt-0.5">{b.bookingRef}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Guest */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Billed To</p>
                <p className="text-sm font-semibold text-gray-900">{b.firstName} {b.lastName}</p>
                <p className="text-sm text-gray-500">{b.email} · {b.phone}</p>
              </div>

              {/* Stay */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Hotel: </span><span className="font-medium text-gray-800">{b.hotelName}</span></div>
                <div><span className="text-gray-400">Nights: </span><span className="font-medium text-gray-800">{b.nights}</span></div>
                <div><span className="text-gray-400">Check-in: </span><span className="font-medium text-gray-800">{b.checkIn}</span></div>
                <div><span className="text-gray-400">Check-out: </span><span className="font-medium text-gray-800">{b.checkOut}</span></div>
              </div>

              {/* Line items */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-1 font-medium">Description</th>
                      <th className="text-right pb-1 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700">{r.name} × {b.nights} nights</td>
                        <td className="py-1.5 text-right text-gray-700">{fmt((r.publicRate || 0) * b.nights)}</td>
                      </tr>
                    ))}
                    {extras.map((e, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700">{e.name}</td>
                        <td className="py-1.5 text-right text-gray-700">{fmt(e.total || e.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Public Rate Total</span><span>{fmt(b.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Luxotel Saving</span><span>−{fmt(b.discount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span>{fmt(b.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Payment</span>
                  <span>{b.paymentMethod === 'hotel' ? 'Pay at Hotel' : 'Paid Online'} · {b.paymentStatus}</span>
                </div>
              </div>

              <div className="text-xs text-gray-400">Issued {fmtDate(selected.createdAt)} · Email sent automatically on booking confirmation</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
