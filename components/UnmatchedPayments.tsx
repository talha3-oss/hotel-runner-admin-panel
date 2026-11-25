'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

// Money the bank has taken, and what became of it.
//
// This exists because the sweep is silent. It runs every ten minutes,
// gives back anything the bank is holding that no booking belongs to, and
// writes a line to a log file nobody reads. That is the wrong shape for
// money: when a guest rings up asking where their payment went, somebody
// needs a page, not a server log.
//
// Every row here is a real payment at the bank. Most of them have a
// booking and want no attention. The ones that do not are put at the top.

interface Row {
  transactionId: string
  reference: string | null
  at: string | null
  amount: number
  currency: string
  captured: boolean
  authorized: boolean
  booking: { ref: string; guest: string; email: string; status: string } | null
  returned: boolean
  returnedAt: string | null
  attempts: number
  lastError: string | null
  lastTriedAt: string | null
  /** Still inside the half hour a guest might be finishing their booking
   *  in. Nothing is given back under somebody who is still buying. */
  waiting: boolean
}

interface Report {
  ok: boolean
  reason?: string
  rows?: Row[]
  orphans?: number
  held?: number
  currency?: string
}

function when(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function UnmatchedPayments() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(48)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async (window: number) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/unmatched?hours=${window}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      setReport(res)
    } catch {
      setReport({ ok: false, reason: 'Could not reach the server.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(hours) }, [load, hours])

  /** Give one payment back now. The sweep would get to it on its own;
   *  this is for when somebody is standing there. */
  const giveBack = async (row: Row) => {
    if (!confirm(
      `Return ${row.amount} ${row.currency} to the guest?\n\n`
      + `Transaction ${row.transactionId}\n`
      + `Reference ${row.reference || '—'}\n\n`
      + 'This sends the money back at the bank and cannot be undone.'
    )) return

    setBusy(row.transactionId); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactionId: row.transactionId }),
      }).then(r => r.json())
      setMsg({ ok: res.ok === true, text: res.message || (res.ok ? 'Returned.' : 'The bank refused the return.') })
      await load(hours)
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setBusy(null)
    }
  }

  const sweepNow = async () => {
    setBusy('sweep'); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/sweep`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      setMsg(
        res.ran === false
          ? { ok: false, text: `Not checked — ${res.reason}.` }
          : res.orphans === 0
            ? { ok: true, text: 'Checked. Every payment has a booking against it.' }
            : { ok: res.failed === 0, text: `${res.orphans} with no booking, ${res.returned} returned, ${res.failed} still held.` }
      )
      await load(hours)
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setBusy(null)
    }
  }

  const rows = report?.rows || []
  const stuck = rows.filter(r => !r.booking && !r.returned && !r.waiting)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[16rem]">
          <p className="text-sm font-semibold text-gray-900">Money the bank has taken</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Read straight from the bank, not from our own records — so a payment nobody here knows
            about still shows. Anything with no booking against it is given back on its own within
            ten minutes.
          </p>
        </div>
        <select
          value={hours}
          onChange={e => setHours(Number(e.target.value))}
          className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value={24}>Last 24 hours</option>
          <option value={48}>Last 48 hours</option>
          <option value={168}>Last 7 days</option>
          <option value={720}>Last 30 days</option>
        </select>
        <button
          onClick={() => load(hours)}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={sweepNow}
          disabled={busy !== null}
          className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {busy === 'sweep' ? 'Checking…' : 'Return all unmatched'}
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {report && !report.ok && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{report.reason}</div>
      )}

      {stuck.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>
            <strong>{stuck.length} payment{stuck.length === 1 ? '' : 's'} with no booking</strong> —{' '}
            {stuck.reduce((s, r) => s + (Number(r.amount) || 0), 0).toFixed(3)} {stuck[0].currency} is
            held by the bank and has not been given back. The reason is on each row.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">Taken</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Returned</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Asking the bank…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No payments in this window.
                </td></tr>
              )}
              {!loading && rows.map(row => {
                const orphan = !row.booking && !row.returned
                return (
                  <tr key={row.transactionId} className={orphan && !row.waiting ? 'bg-amber-50/40' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{when(row.at)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">{row.reference || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.transactionId}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-gray-900">
                      {row.amount} {row.currency}
                      <div className="text-[11px] font-normal text-gray-400">
                        {row.captured ? 'taken' : 'held'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.booking ? (
                        <>
                          <div className="font-medium text-gray-900">{row.booking.ref}</div>
                          <div className="text-xs text-gray-500">{row.booking.guest}</div>
                        </>
                      ) : row.waiting ? (
                        <span className="text-xs text-gray-500">Still being booked</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.returned ? (
                        <>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                          <div className="text-xs text-gray-400 mt-0.5">{when(row.returnedAt)}</div>
                        </>
                      ) : row.booking ? (
                        <span className="text-xs text-gray-400">Not needed</span>
                      ) : (
                        <>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            No
                          </span>
                          {/* The bank's own words. Most of what goes wrong
                              here is on their side and only they can fix
                              it, so it has to be readable. */}
                          {row.lastError && (
                            <div className="text-xs text-red-600 mt-1 max-w-xs">
                              {row.lastError}
                              <span className="text-gray-400">
                                {' '}({row.attempts} {row.attempts === 1 ? 'try' : 'tries'}, last {when(row.lastTriedAt)})
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {orphan && !row.waiting && (
                        <button
                          onClick={() => giveBack(row)}
                          disabled={busy !== null}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          {busy === row.transactionId ? 'Returning…' : 'Return now'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
