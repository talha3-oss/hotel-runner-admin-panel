'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import {
  fetchSubscribers,
  deleteSubscriber,
  downloadSubscribersCsv,
  Subscriber,
} from '../../../lib/api'

const PER_PAGE = 50

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MarketingPage() {
  const [rows, setRows] = useState<Subscriber[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // The search asks the server, so it waits for a pause in typing rather than
  // sending a request per keystroke.
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { setTerm(search); setPage(1) }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [search])

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const result = await fetchSubscribers(token, { search: term, page, limit: PER_PAGE })
      if (result.success) {
        setRows(result.subscribers || [])
        setTotal(result.total || 0)
        setPages(result.pages || 1)
      } else {
        setError(result.message || 'Could not load the list.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [term, page])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setExporting(true)
    setError('')
    try {
      // Whatever is being searched for is what gets exported, so a filtered
      // list and its export cannot disagree.
      const blob = await downloadSubscribersCsv(token, term)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `luxotel-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not export the list.')
    } finally {
      setExporting(false)
    }
  }

  const remove = async (row: Subscriber) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!confirm(`Remove ${row.email} from the list? This cannot be undone.`)) return

    setDeleting(row.id)
    try {
      const result = await deleteSubscriber(token, row.id)
      if (result.success) await load()
      else setError(result.message || 'Could not remove that subscriber.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everyone who signed up through the footer on the site. {total} {total === 1 ? 'person' : 'people'}.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {exporting ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <EnvelopeIcon className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">
              {term ? 'Nobody matches that' : 'No sign-ups yet'}
            </p>
            {!term && (
              <p className="mt-1 text-sm text-gray-400">
                Sign-ups from the footer on the site appear here.
              </p>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">First Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Email</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 sm:table-cell">Signed Up</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 md:table-cell">From</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className={`hover:bg-gray-50 ${row.unsubscribedAt ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.firstName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <a href={`mailto:${row.email}`} className="hover:text-primary-600">{row.email}</a>
                    {row.unsubscribedAt && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                        Unsubscribed
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">{formatDate(row.createdAt)}</td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-gray-400 md:table-cell">{row.source || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(row)}
                      disabled={deleting === row.id}
                      title="Remove from the list"
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pages))}
            disabled={page >= pages}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Next <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
