'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { fetchHotels, Hotel } from '../../../lib/api'
import { CURRENCY } from '../../../lib/currency'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

interface RateCell {
  amounts: Record<string, number>
  // A rate RateTiger sent with no numberOfGuests on it, which is how they
  // actually send them. Absent from `amounts`, and the only price on most rows.
  baseAmount: number | null
  childAmount: number | null
  extraAdultAmount: number | null
  extraChildAmount: number | null
  currencyCode: string | null
  taxInclusive: boolean
  stopSell: boolean | null
  closedToArrival: boolean | null
  closedToDeparture: boolean | null
  minLos: number | null
  maxLos: number | null
  minAdvance: string | null
  maxAdvance: string | null
  updatedAt: string | null
}

interface Calendar {
  hotel: { id: string; name: string; rateTigerHotelCode: string | null; connected: boolean }
  dates: string[]
  roomCodes: Array<{ code: string; name: string; totalRooms: number | null }>
  ratePlans: Array<{ code: string; name: string }>
  pairs: Array<{ roomCode: string; planCode: string; fallbackPrice: number }>
  rates: Record<string, RateCell>
  availability: Record<string, number>
  publishedNights: number
}

const DAY_OPTIONS = [14, 30, 60, 90]

const today = () => new Date().toISOString().slice(0, 10)

const addDays = (day: string, count: number) => {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

const dayLabel = (day: string) => {
  const date = new Date(`${day}T00:00:00.000Z`)
  return {
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    number: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    weekend: [0, 6].includes(date.getUTCDay()),
  }
}

// The price to show for one night. RateTiger fills occupancy tiers and may not
// fill them all, so show the two-guest rate where there is one — a room is sold
// per room — and otherwise the lowest tier it did price.
const displayAmount = (cell: RateCell | undefined) => {
  if (!cell) return null
  const tiers = Object.entries(cell.amounts)
    .map(([guests, amount]) => [Number(guests), Number(amount)] as const)
    .sort((a, b) => a[0] - b[0])
  if (tiers.length > 0) {
    const two = tiers.find(([g]) => g === 2)
    return two ? two[1] : tiers[0][1]
  }
  // RateTiger's updates carry no occupancy, so this is the usual case rather
  // than the exception: one price for the room whoever is in it.
  return cell.baseAmount ?? null
}

export default function RatesPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [hotelId, setHotelId] = useState('')
  const [start, setStart] = useState(today())
  const [days, setDays] = useState(30)

  const [calendar, setCalendar] = useState<Calendar | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || ''
    fetchHotels(token)
      .then(data => {
        const list: Hotel[] = data?.hotels || data?.data || []
        setHotels(list)
        // Open on a property that is actually on RateTiger — on any other one
        // the page would be empty for reasons that have nothing to do with it.
        const connected = list.find(h => h.rateTigerHotelCode)
        setHotelId(connected?.id || list[0]?.id || '')
      })
      .catch(() => setError('Could not load hotels.'))
  }, [])

  const load = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('adminToken') || ''
      const query = new URLSearchParams({ hotelId, start, end: addDays(start, days - 1) })
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/ari?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }).then(r => r.json())
      if (res.success) setCalendar(res)
      else { setCalendar(null); setError(res.message || 'Could not load the calendar.') }
    } catch {
      setCalendar(null)
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [hotelId, start, days])

  useEffect(() => { load() }, [load])

  const planNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const plan of calendar?.ratePlans || []) map.set(plan.code, plan.name)
    return map
  }, [calendar])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rates &amp; Availability</h1>
        <p className="mt-1 text-sm text-gray-500">
          What RateTiger has published for each night. This is read-only: these numbers are theirs,
          and anything typed over them would be replaced by their next update. The room&apos;s own
          price is what applies on nights they have not priced.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hotel</label>
          <select
            value={hotelId}
            onChange={e => setHotelId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg min-w-[240px]"
          >
            {hotels.map(hotel => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}{hotel.rateTigerHotelCode ? '' : ' — not on RateTiger'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            {DAY_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {calendar && !calendar.hotel.connected && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span>
            This property has no RateTiger hotel code, so RateTiger cannot publish anything for it.
            Set one on the hotel to connect it.
          </span>
        </div>
      )}

      {calendar && calendar.hotel.connected && calendar.publishedNights === 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          RateTiger has not published a price for any of these nights yet. Every night below falls
          back to the room&apos;s own price. If this stays empty, ask RateTiger to enable price and
          inventory updates for hotel code <span className="font-mono">{calendar.hotel.rateTigerHotelCode}</span>.
        </div>
      )}

      {calendar && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[220px]">
                    Room / Rate plan
                  </th>
                  {calendar.dates.map(day => {
                    const label = dayLabel(day)
                    return (
                      <th
                        key={day}
                        className={`px-2 py-2 text-center font-medium border-b border-gray-200 whitespace-nowrap ${label.weekend ? 'bg-gray-100 text-gray-700' : 'text-gray-600'}`}
                      >
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">{label.weekday}</div>
                        <div>{label.number}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {calendar.roomCodes.map(room => {
                  const plans = calendar.pairs.filter(p => p.roomCode === room.code)
                  return (
                    <Fragment key={room.code}>
                      {/* Rooms free each night. RateTiger's count where they sent
                          one, otherwise the property's own rooms less what this
                          site has sold. */}
                      <tr className="bg-gray-50/70">
                        <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2 border-b border-r border-gray-200">
                          <div className="font-semibold text-gray-900 font-mono">{room.code}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{room.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Rooms free {room.totalRooms == null && <span className="text-amber-600">· Total Rooms not set</span>}
                          </div>
                        </td>
                        {calendar.dates.map(day => {
                          const free = calendar.availability[`${room.code}|${day}`]
                          // More rooms on sale than the property has is not a
                          // display quirk — it is the room being oversold, and
                          // it comes from whoever published the count.
                          const over = free !== undefined && room.totalRooms != null && free > room.totalRooms
                          return (
                            <td
                              key={day}
                              title={over ? `${free} on sale, but this property has only ${room.totalRooms} ${room.code} rooms` : ''}
                              className={`px-2 py-2 text-center border-b border-gray-100 font-medium ${
                                free === undefined ? 'text-gray-300'
                                  : over ? 'bg-orange-100 text-orange-800'
                                  : free <= 0 ? 'bg-red-50 text-red-700'
                                  : free <= 2 ? 'text-amber-700' : 'text-gray-700'
                              }`}
                            >
                              {free === undefined ? '—' : free}
                              {over && <div className="text-[10px] leading-none">over</div>}
                            </td>
                          )
                        })}
                      </tr>

                      {plans.map(pair => (
                        <tr key={`${room.code}-${pair.planCode}`} className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 bg-white px-4 py-2 border-b border-r border-gray-200">
                            <div className="font-mono text-xs text-gray-900">{pair.planCode}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {planNames.get(pair.planCode)}
                            </div>
                          </td>
                          {calendar.dates.map(day => {
                            const cell = calendar.rates[`${room.code}|${pair.planCode}|${day}`]
                            const amount = displayAmount(cell)
                            const closed = cell?.stopSell === true
                            const flags = [
                              cell?.closedToArrival ? 'A' : '',
                              cell?.closedToDeparture ? 'D' : '',
                              cell?.minLos ? `≥${cell.minLos}` : '',
                            ].filter(Boolean).join(' ')

                            return (
                              <td
                                key={day}
                                title={
                                  closed ? 'Stop-sell — RateTiger has closed this night'
                                    : amount === null ? `Not published — the room's own price applies (${CURRENCY} ${pair.fallbackPrice})`
                                    : `${cell?.taxInclusive ? 'After tax' : 'Before tax'}${cell?.updatedAt ? ` · updated ${new Date(cell.updatedAt).toLocaleString('en-GB')}` : ''}`
                                }
                                className={`px-2 py-2 text-center border-b border-gray-100 whitespace-nowrap ${
                                  closed ? 'bg-red-50 text-red-700 font-semibold'
                                    : amount === null ? 'text-gray-300' : 'text-gray-900'
                                }`}
                              >
                                {closed ? 'STOP' : amount === null ? (
                                  <span className="text-gray-300">{pair.fallbackPrice}</span>
                                ) : amount}
                                {flags && <div className="text-[10px] text-amber-600 leading-none mt-0.5">{flags}</div>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
            <span>Amounts in {CURRENCY}, per night.</span>
            <span><span className="text-gray-300">Grey</span> — not published, the room&apos;s own price applies.</span>
            <span><span className="text-red-700 font-semibold">STOP</span> — closed by RateTiger.</span>
            <span><span className="text-orange-800 bg-orange-100 px-1">over</span> — more rooms on sale than the property has.</span>
            <span><span className="text-amber-600">A</span> closed to arrival · <span className="text-amber-600">D</span> closed to departure · <span className="text-amber-600">≥n</span> minimum nights.</span>
          </div>
        </div>
      )}

      {calendar && calendar.roomCodes.length === 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-sm text-gray-500 text-center">
          This property has no rooms with both a room code and a rate plan key, so there is nothing
          for RateTiger to price.
        </div>
      )}
    </div>
  )
}
