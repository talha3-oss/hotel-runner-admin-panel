'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { fetchCookieStats, CookieConsentRecord, CookieStats } from '../../../lib/api'

const DEFAULT_STATS: CookieStats = {
  total: 0,
  analyticsAccepted: 0,
  marketingAccepted: 0,
  functionalAccepted: 0,
  thisMonth: 0,
  analyticsRate: 0,
  marketingRate: 0,
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export default function CookiesPage() {
  const [stats, setStats] = useState<CookieStats>(DEFAULT_STATS)
  const [consents, setConsents] = useState<CookieConsentRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const load = useCallback(async (p = 1) => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    setError('')
    try {
      const result = await fetchCookieStats(token, { page: p, limit })
      if (result.success) {
        setStats(result.stats)
        setConsents(result.consents || [])
        setTotal(result.total || 0)
      } else {
        setError(result.message || 'Failed to load data.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cookie Consents</h1>
        <p className="mt-1 text-sm text-gray-600">Visitor cookie preferences for marketing and analytics insights</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-3">
            <GlobeAltIcon className="h-7 w-7 text-primary-600" />
            <p className="text-sm font-medium text-gray-600">Total Consents</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.thisMonth} this month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-3">
            <MegaphoneIcon className="h-7 w-7 text-orange-500" />
            <p className="text-sm font-medium text-gray-600">Marketing</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.marketingRate}%</p>
          <RateBar value={stats.marketingRate} color="bg-orange-400" />
          <p className="text-xs text-gray-400 mt-1">{stats.marketingAccepted} visitors accepted</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-3">
            <ChartBarIcon className="h-7 w-7 text-blue-500" />
            <p className="text-sm font-medium text-gray-600">Analytics</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.analyticsRate}%</p>
          <RateBar value={stats.analyticsRate} color="bg-blue-400" />
          <p className="text-xs text-gray-400 mt-1">{stats.analyticsAccepted} visitors accepted</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircleIcon className="h-7 w-7 text-green-500" />
            <p className="text-sm font-medium text-gray-600">Functional</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.total > 0 ? Math.round((stats.functionalAccepted / stats.total) * 100) : 0}%
          </p>
          <RateBar
            value={stats.total > 0 ? Math.round((stats.functionalAccepted / stats.total) * 100) : 0}
            color="bg-green-400"
          />
          <p className="text-xs text-gray-400 mt-1">{stats.functionalAccepted} visitors accepted</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Recent Consent Records</h2>
          <span className="text-xs text-gray-400">{total} total records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Necessary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Functional</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analytics</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marketing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldCheckIcon className="h-10 w-10 text-gray-200" />
                        <p className="text-sm font-medium text-gray-400">No consent records yet</p>
                        <p className="text-xs text-gray-300 max-w-xs">Records will appear here as visitors interact with the cookie banner on the website.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  consents.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500">{c.sessionId.slice(0, 8)}…</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.page || '/'}</td>
                      {[c.necessary, c.functional, c.analytics, c.marketing].map((v, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap">
                          {v ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-300" />
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
