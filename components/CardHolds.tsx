'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

// Money the bank is holding for a guest who has not arrived yet.
//
// A Pay at Hotel booking leaves an authorization on the card for the first
// night. Nothing has been charged by it -- it only sits on the guest's
// available balance -- and nothing closes it except this screen or the
// night audit.
//
// Two things can be done with one, and both are here because the desk is
// the only place that knows which:
//
//   Release   the guest paid at the desk, or the booking is off and the
//             terms charge nothing. The whole hold goes back.
//   Charge    the terms say something is kept. Whatever is not taken is
//             released in the same breath, so a half-night fee does not
//             leave the other half on the card until it expires.
//
// The figure beside each row is the cancellation terms worked out by the
// server for this minute -- the same calculation the night audit uses --
// so what a person sees and what the machine would do cannot drift apart.
// It can be typed over, and never upward past the hold.

interface Quote {
  tier: string
  percent: number
  base: number
  charge: number
  release: number
  why: string
  deadlines: { free: string | null; mid: string | null; noShow: string | null }
}

interface Hold {
  id: number
  bookingRef: string
  guest: string
  email: string
  hotel: string | null
  status: string
  checkIn: string
  checkOut: string
  paymentRef: string | null
  paymentMerchantRef: string | null
  paymentAuthAmount: number | null
  paymentCurrency: string | null
  paymentAuthorizedAt: string | null
  checkedInAt: string | null
  quote: Quote
}

function when(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const day = (value: string | null) =>
  !value ? '—' : new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

/** What the terms say about this one, in two words, with a colour that
 *  matches how much it costs. */
const TIER = {
  free: ['Free to cancel', 'bg-green-100 text-green-800'],
  partial: ['Part charge', 'bg-amber-100 text-amber-800'],
  late: ['Full first night', 'bg-red-100 text-red-800'],
  noshow: ['No-show', 'bg-red-100 text-red-800'],
} as const

export default function CardHolds() {
  const [rows, setRows] = useState<Hold[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [auditing, setAuditing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/holds`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
      if (res.success) { setRows(res.rows || []); setError('') }
      else setError(res.message || 'Could not read the holds.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** Release the whole hold, or take part of it. The amount is confirmed
   *  in words before anything is sent, because neither can be undone from
   *  here -- a released hold cannot be re-taken, and a charge comes back
   *  only as a refund. */
  const settle = async (row: Hold, action: 'charge' | 'release') => {
    const held = Number(row.paymentAuthAmount) || 0
    const currency = row.paymentCurrency || ''
    let amount: number | null = null

    if (action === 'charge') {
      const typed = prompt(
        `Charge how much of the hold on ${row.bookingRef}?\n\n`
        + `Held: ${held} ${currency}\n`
        + `The cancellation terms say ${row.quote.charge} ${currency} (${row.quote.percent}% of the first night).\n\n`
        + 'Anything not charged is released back to the guest at the same time.',
        String(row.quote.charge)
      )
      if (typed == null) return
      amount = Number(typed)
      if (!Number.isFinite(amount) || amount < 0) { setMsg({ ok: false, text: 'That is not an amount.' }); return }
      if (amount > held) { setMsg({ ok: false, text: `The bank is only holding ${held} ${currency}.` }); return }
      if (!confirm(`Charge ${amount} ${currency} to ${row.guest || row.bookingRef}?\n\nThis cannot be undone from here.`)) return
    } else {
      if (!confirm(
        `Release the hold of ${held} ${currency} on ${row.bookingRef}?\n\n`
        + 'The guest gets their available balance back. A released hold cannot be re-taken — '
        + 'the guest would have to pay again.'
      )) return
    }

    setBusy(row.id); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/holds/${row.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, amount }),
      }).then(r => r.json())
      setMsg({ ok: res.ok === true, text: res.message || (res.ok ? 'Done.' : 'The bank refused it.') })
      await load()
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setBusy(null)
    }
  }

  /** The night audit, by hand. It runs on its own every quarter of an
   *  hour; this is for when somebody wants to see it happen. */
  const runAudit = async () => {
    if (!confirm(
      'Run the night audit now?\n\n'
      + 'Every Pay at Hotel booking past its audit hour whose guest has not checked in will be '
      + 'cancelled and charged for the first night.'
    )) return
    setAuditing(true); setMsg(null)
    try {
      const token = localStorage.getItem('adminToken') || ''
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/night-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      }).then(r => r.json())
      setMsg(
        res.ran === false
          ? { ok: false, text: `Not run — ${res.reason}.` }
          : res.due === 0
            ? { ok: true, text: 'Nothing due. Every arrival is either checked in or still inside its hour.' }
            : { ok: res.failed === 0, text: `${res.due} no-show(s): ${res.charged} charged, ${res.cancelled} cancelled, ${res.failed} problem(s).` }
      )
      await load()
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    } finally {
      setAuditing(false)
    }
  }

  const needle = query.trim().toLowerCase()
  const shown = rows.filter(r =>
    !needle
    || [r.bookingRef, r.guest, r.email, r.paymentRef, r.paymentMerchantRef, r.hotel]
      .some(v => String(v || '').toLowerCase().includes(needle))
  )

  const held = rows.reduce((s, r) => s + (Number(r.paymentAuthAmount) || 0), 0)
  const currency = rows[0]?.paymentCurrency || ''

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[16rem]">
          <p className="text-sm font-semibold text-gray-900">Holds on guests&rsquo; cards</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Pay at Hotel bookings. Nothing has been charged — the first night is held on the card and
            waits here until the guest pays at the desk, cancels, or does not arrive.
            {rows.length > 0 && <> <strong>{held.toFixed(3)} {currency}</strong> held across {rows.length} booking{rows.length === 1 ? '' : 's'}.</>}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={runAudit}
          disabled={auditing || busy !== null}
          className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {auditing ? 'Running…' : 'Run night audit'}
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Booking, guest, hotel, transaction…"
            className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Arrives</th>
                <th className="px-4 py-3 text-right">Held</th>
                <th className="px-4 py-3">If cancelled now</th>
                <th className="px-4 py-3">No-show at</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Reading the holds…</td></tr>
              )}
              {!loading && shown.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  {rows.length === 0
                    ? 'No cards are being held just now.'
                    : `Nothing matching “${query.trim()}”.`}
                </td></tr>
              )}
              {!loading && shown.map(row => {
                const [label, colour] = TIER[row.quote.tier as keyof typeof TIER] || ['—', 'bg-gray-100 text-gray-700']
                const currency = row.paymentCurrency || ''
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.bookingRef}</div>
                      <div className="text-xs text-gray-500">{row.guest}</div>
                      {row.hotel && <div className="text-xs text-gray-400">{row.hotel}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {day(row.checkIn)}
                      {row.checkedInAt && (
                        <div className="text-[11px] text-green-700">Checked in {when(row.checkedInAt)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-gray-900">
                      {row.paymentAuthAmount} {currency}
                      <div className="text-[11px] font-normal text-gray-400">held, not charged</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colour}`}>
                        {label}
                      </span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {row.quote.charge > 0
                          ? `${row.quote.charge} ${currency} kept, ${row.quote.release} ${currency} back`
                          : 'Nothing kept'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {when(row.quote.deadlines.noShow)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => settle(row, 'release')}
                          disabled={busy !== null}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          {busy === row.id ? '…' : 'Release'}
                        </button>
                        <button
                          onClick={() => settle(row, 'charge')}
                          disabled={busy !== null}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Charge
                        </button>
                      </div>
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
