'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import {
  fetchRateTigerLogs, fetchRateTigerLog,
  type RateTigerLogRow, type RateTigerLogList,
} from '@/lib/api'

// What RateTiger sent and what we answered.
//
// The question this exists to answer is a specific one, asked often: "is that
// figure theirs or ours?" A child rate of 1500 JOD sat on one room for eleven
// days because the only record was a log file on the server that had since
// rotated away. The price pull cannot answer it either -- it fills a gap with
// our own figure, so a rate they published and one they never sent look
// identical from outside. These are the raw messages.

const PAGE = 25

function when(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

/** Highlights the child amounts, which are what people come here to find. */
function Body({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="px-3 py-2 text-xs text-gray-400">Nothing recorded.</p>
  }
  const text = JSON.stringify(value, null, 2)
  const lines = text.split('\n')
  return (
    <pre className="max-h-[28rem] overflow-auto rounded bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-gray-200">
      {lines.map((line, i) => {
        const child = line.includes('"8"')
        const adult = line.includes('"10"')
        return (
          <div key={i} className={child ? 'bg-amber-500/25' : adult ? 'bg-sky-500/10' : undefined}>
            {line}
          </div>
        )
      })}
    </pre>
  )
}

function Detail({ id, token }: { id: string; token: string }) {
  const [state, setState] = useState<{ loading: boolean; request?: unknown; response?: unknown; error?: string }>(
    { loading: true }
  )

  useEffect(() => {
    let live = true
    fetchRateTigerLog(token, id)
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
        <span className="mr-3 inline-block rounded bg-amber-500/25 px-1">ageQualifyingCode 8 — child</span>
        <span className="inline-block rounded bg-sky-500/20 px-1">10 — adult</span>
      </p>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-700">What they sent</p>
        <Body value={state.request} />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-700">What we answered</p>
        <Body value={state.response} />
      </div>
    </div>
  )
}

export default function RateTigerLogs() {
  const [data, setData] = useState<RateTigerLogList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const [direction, setDirection] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const token = typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || ''

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchRateTigerLogs(token, { page, limit: PAGE, kind, direction, status, search })
      .then(r => {
        if (r.success) setData(r)
        // A table that has not been created yet is the likely reason, and
        // "nothing here" would be a misleading way to say so.
        else setError(r.message || 'Could not load the log.')
      })
      .catch(e => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [token, page, kind, direction, status, search])

  useEffect(() => { load() }, [load])

  const rows: RateTigerLogRow[] = data?.logs || []

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Message log</h3>
        <p className="mt-1 text-xs text-gray-500">
          Every message exchanged with RateTiger. <strong>IN</strong> is what they sent us,
          <strong> OUT</strong> is a reservation we pushed to them. Open a row to see the
          amounts exactly as they travelled — a child rate is the one at{' '}
          <code className="rounded bg-gray-100 px-1">ageQualifyingCode 8</code>.
          {data ? ` Kept for ${data.retentionDays} days.` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={direction} onChange={e => { setPage(1); setDirection(e.target.value) }}
          className="h-9 rounded-lg border border-gray-300 px-2 text-sm">
          <option value="">Both directions</option>
          <option value="IN">IN — from RateTiger</option>
          <option value="OUT">OUT — to RateTiger</option>
        </select>

        <select value={kind} onChange={e => { setPage(1); setKind(e.target.value) }}
          className="h-9 rounded-lg border border-gray-300 px-2 text-sm">
          <option value="">Every message</option>
          {(data?.kinds || []).map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value) }}
          className="h-9 rounded-lg border border-gray-300 px-2 text-sm">
          <option value="">Accepted and refused</option>
          <option value="ok">Accepted</option>
          <option value="failed">Refused</option>
        </select>

        <input value={search} placeholder="requestId, hotel code or reason"
          onChange={e => { setPage(1); setSearch(e.target.value) }}
          className="h-9 min-w-[16rem] flex-1 rounded-lg border border-gray-300 px-3 text-sm" />

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
              <th className="px-3 py-2 font-medium">Dir</th>
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium">Hotel</th>
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
                Nothing recorded yet. Messages appear here as RateTiger sends them.
              </td></tr>
            )}
            {rows.map(row => (
              // The opened message renders inside this fragment, directly
              // under its own row. It used to be appended after the whole
              // list, so opening the first row put its bodies below the
              // second -- and the detail read as if it belonged to the row
              // above it. Two rows, two different messages, and the screen
              // said the wrong one.
              <Fragment key={row.id}>
              <tr className="align-top">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{when(row.createdAt)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    row.direction === 'IN' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'}`}>
                    {row.direction}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-800">{row.kind}</p>
                  {row.requestId && <p className="text-[11px] text-gray-400">{row.requestId}</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{row.hotelCode || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    row.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {row.ok ? 'accepted' : 'refused'}
                  </span>
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

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">{data.total} message{data.total === 1 ? '' : 's'}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40">Back</button>
            <span className="text-xs text-gray-500">{data.page} / {data.pages}</span>
            <button type="button" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
