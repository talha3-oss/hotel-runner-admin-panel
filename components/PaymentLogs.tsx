'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'

// The same line the settings page uses. lib/api keeps its own copy private,
// and a second default here would be one more place to be wrong about where
// the server is.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

// Every exchange with the bank.
//
// There is one question this exists to answer, and it is always asked in a
// hurry: a guest says they were charged and the booking says they were not.
// The bank's own portal shows their side; this is ours, with the exact
// request that went and the exact answer that came back.
//
// Nothing sensitive is in here to find. The card never reaches our server at
// all, and the token that stands in for it is stripped before a row is
// written -- see paymentLog.service in the backend. What is left is amounts,
// outcomes and references.

const PAGE = 50

interface Row {
  id: string
  createdAt: string
  provider: string
  action: string
  environment: string | null
  bookingRef: string | null
  reference: string | null
  statusCode: number | null
  ok: boolean
  outcome: string | null
  note: string | null
  amount: number | null
  currency: string | null
  durationMs: number | null
}

// What each one was for, in words rather than in the name the code uses.
const WHAT: Record<string, string> = {
  session: 'Opened a payment',
  'test-connection': 'Tested the connection',
  verify: 'Checked a payment',
  capture: 'Took a held amount',
  reverse: 'Released a hold',
  refund: 'Refunded',
}

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function Body({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gray-700">{label}</p>
      {value === null || value === undefined ? (
        <p className="rounded bg-gray-900 px-3 py-2 text-[11px] text-gray-400">Nothing recorded.</p>
      ) : (
        <pre className="max-h-[28rem] overflow-auto rounded bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-gray-200">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  )
}

function Detail({ id, token }: { id: string; token: string }) {
  const [state, setState] = useState<{ loading: boolean; request?: unknown; response?: unknown; error?: string }>({ loading: true })

  useEffect(() => {
    let live = true
    fetch(`${API_BASE_URL}/api/v1/admin/settings/payment-logs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(r => {
        if (!live) return
        if (!r.success || !r.log) setState({ loading: false, error: r.message || 'Could not load it.' })
        else setState({ loading: false, request: r.log.request, response: r.log.response })
      })
      .catch(e => live && setState({ loading: false, error: String(e?.message || e) }))
    return () => { live = false }
  }, [id, token])

  if (state.loading) return <p className="px-3 py-3 text-xs text-gray-400">Loading…</p>
  if (state.error) return <p className="px-3 py-3 text-xs text-red-600">{state.error}</p>

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-[11px] text-gray-500">
        Anything that could stand in for a card — the payment token, the session — is
        removed before the row is written, so it is not missing here by accident.
      </p>
      <Body label="What we sent" value={state.request} />
      <Body label="What the bank answered" value={state.response} />
    </div>
  )
}

export default function PaymentLogs() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [action, setAction] = useState('')
  const [bookingRef, setBookingRef] = useState('')

  const token = typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || ''

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const q = new URLSearchParams({ limit: String(PAGE) })
    if (action) q.set('action', action)
    if (bookingRef.trim()) q.set('bookingRef', bookingRef.trim())

    fetch(`${API_BASE_URL}/api/v1/admin/settings/payment-logs?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(r => {
        if (r.success) setRows(r.logs || [])
        // Almost always a server that has not been deployed yet, and
        // "nothing here" would be a misleading way to say so.
        else setError(r.message || 'Could not load the payment log.')
      })
      .catch(e => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [token, action, bookingRef])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Payment log</h3>
        <p className="mt-1 text-xs text-gray-500">
          Every call made to the bank and every answer that came back, kept for
          roughly a year because a payment dispute arrives months after the stay.
          A row marked <strong>test</strong> is from the sandbox and is not
          anybody&rsquo;s money. No card number and no payment token is stored — the
          card never reaches this server, and the token that stands in for it is
          removed before the row is written.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={action} onChange={e => setAction(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 px-2 text-sm">
          <option value="">Everything</option>
          {Object.entries(WHAT).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* One box for both. A guest quotes a booking reference; a bank
            statement quotes the transaction id; whoever is looking has
            one of the two and should not have to know which box it goes
            in. Every row for one payment -- taking it, checking it,
            giving it back -- carries the same transaction id, so either
            term finds the whole story. */}
        <input value={bookingRef} placeholder="Booking reference or bank transaction id"
          onChange={e => setBookingRef(e.target.value)}
          className="h-9 min-w-[20rem] flex-1 rounded-lg border border-gray-300 px-3 text-sm" />

        <button type="button" onClick={load}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50">
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">What</th>
              <th className="px-3 py-2 font-medium">Booking</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">
                Nothing recorded yet. Rows appear here the first time the site talks to the bank.
              </td></tr>
            )}
            {rows.map(row => (
              // The opened row renders inside this fragment, directly under
              // its own row, so the detail can never read as belonging to
              // the row below it.
              <Fragment key={row.id}>
                <tr className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{when(row.createdAt)}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{WHAT[row.action] || row.action}</p>
                    {row.environment === 'test' && (
                      <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        test
                      </span>
                    )}
                    {row.reference && <p className="text-[11px] text-gray-400">{row.reference}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-600">{row.bookingRef || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                    {row.amount != null ? `${row.currency || ''} ${row.amount}`.trim() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      row.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {row.ok ? 'accepted' : 'refused'}
                    </span>
                    {row.outcome && <span className="ml-2 text-[11px] text-gray-500">{row.outcome}</span>}
                    {row.statusCode != null && <span className="ml-2 text-[11px] text-gray-400">HTTP {row.statusCode}</span>}
                    {row.durationMs != null && <span className="ml-2 text-[11px] text-gray-400">{row.durationMs} ms</span>}
                    {row.note && <p className="mt-0.5 text-[11px] text-red-600">{row.note}</p>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setOpen(open === row.id ? null : row.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                      {open === row.id ? 'Close' : 'Open'}
                    </button>
                  </td>
                </tr>
                {open === row.id && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50 p-0">
                      <Detail id={row.id} token={token} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
