'use client'

// The add-ons on a booking, written by an admin.
//
// There was no way to put one on a booking from this side at all -- not when
// writing one down, not when changing one. The server has always taken them
// (quote, preview-change and the manual create all read `extras`); only the
// form was missing, so a guest who asked for breakfast over the phone could
// not be given it.
//
// Shared by the new-booking page and the editor on a booking's own page, for
// the same reason the room picker is: two forms that price the same thing
// must not disagree about how.
//
// What is held is the add-on's id and, for one sold by the morning, how many
// mornings. The money is worked out from that -- never stored -- so changing
// the dates or who is in the room moves the totals with it instead of
// leaving a figure behind that was true an hour ago.

import { useMemo } from 'react'
import { formatMoney } from '../../../lib/currency'

export type ExtraPriceType = 'per adult per morning' | 'per booking'

export interface HotelExtra {
  id: string
  name: string
  description: string
  price: number
  priceType: ExtraPriceType
}

/** id -> how many mornings. The value is ignored for an add-on sold per
 *  booking; the key being present is what makes it chosen. */
export type PickedExtras = Record<string, number>

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(Math.round(Number(value) || low), low), Math.max(low, high))

/** A property's add-ons, out of the loose JSON the hotel row keeps them in.
 *  Anything without a name or a usable price is not something that can be
 *  sold, so it is left out rather than shown as a blank line. */
export function readHotelExtras(hotel: { bookingExtras?: unknown } | null | undefined): HotelExtra[] {
  const raw = hotel?.bookingExtras
  if (!Array.isArray(raw)) return []

  const out: HotelExtra[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const row = item as Record<string, unknown>
    const name = String(row.name || '').trim()
    const price = Number(row.price)
    if (!name || !Number.isFinite(price) || price < 0) return
    out.push({
      id: String(row.id || name).trim() || `extra-${index}`,
      name,
      description: String(row.description || '').trim(),
      price,
      priceType: row.priceType === 'per adult per morning' ? 'per adult per morning' : 'per booking',
    })
  })
  return out
}

/** What one add-on comes to. The same arithmetic the server does, so the
 *  figure on screen is the figure that gets written. */
export function extraTotal(extra: HotelExtra, adults: number, mornings: number, nights: number): number {
  if (extra.priceType === 'per booking') return extra.price
  return extra.price * Math.max(1, adults) * clamp(mornings, 1, Math.max(1, nights))
}

/** What goes in the request. The server matches on the id, re-reads the
 *  property's own price, and works the mornings back out of the total -- so
 *  an admin cannot invent a price by editing this. */
export function extrasPayload(
  extras: HotelExtra[],
  picked: PickedExtras,
  adults: number,
  nights: number
): { id: string; name: string; total: number }[] {
  return extras
    .filter((extra) => picked[extra.id] !== undefined)
    .map((extra) => ({
      id: extra.id,
      name: extra.name,
      total: extraTotal(extra, adults, picked[extra.id], nights),
    }))
}

/** What a booking already has on it, as something this form can edit. Read
 *  back by name as well as id, because an add-on renamed since the booking
 *  was taken still has its id. */
export function pickedFromBooking(
  extras: HotelExtra[],
  on: { id?: string; name?: string; total?: number }[] | undefined,
  adults: number,
  nights: number
): PickedExtras {
  const picked: PickedExtras = {}
  for (const had of Array.isArray(on) ? on : []) {
    const key = String(had?.id || '').trim().toLowerCase()
    const name = String(had?.name || '').trim().toLowerCase()
    const match = extras.find(
      (extra) => extra.id.toLowerCase() === key || extra.name.toLowerCase() === name
    )
    if (!match) continue

    let mornings = Math.max(1, nights)
    if (match.priceType === 'per adult per morning' && match.price > 0) {
      const each = match.price * Math.max(1, adults)
      const billed = Number(had?.total)
      if (Number.isFinite(billed) && billed > 0) mornings = clamp(billed / each, 1, Math.max(1, nights))
    }
    picked[match.id] = mornings
  }
  return picked
}

export function ExtrasPicker({
  extras, picked, adults, nights, onChange,
}: {
  extras: HotelExtra[]
  picked: PickedExtras
  adults: number
  nights: number
  onChange: (picked: PickedExtras) => void
}) {
  const stay = Math.max(1, nights)
  const subtotal = useMemo(
    () =>
      extras
        .filter((extra) => picked[extra.id] !== undefined)
        .reduce((sum, extra) => sum + extraTotal(extra, adults, picked[extra.id], stay), 0),
    [extras, picked, adults, stay]
  )

  if (extras.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
        This property has no extras set up. They are added under Hotels → the property → Booking extras.
      </div>
    )
  }

  const toggle = (extra: HotelExtra) => {
    const next = { ...picked }
    if (next[extra.id] !== undefined) delete next[extra.id]
    else next[extra.id] = stay
    onChange(next)
  }

  const setMornings = (extra: HotelExtra, value: number) => {
    onChange({ ...picked, [extra.id]: clamp(value, 1, stay) })
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-600">Extras</div>

      <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
        {extras.map((extra) => {
          const on = picked[extra.id] !== undefined
          const byMorning = extra.priceType === 'per adult per morning'
          return (
            <div key={extra.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(extra)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gray-900">{extra.name}</span>
                  <span className="block text-xs text-gray-500">
                    {formatMoney(extra.price)}{' '}
                    {byMorning ? 'per adult, per morning' : 'per booking'}
                  </span>
                </span>
              </label>

              {on && byMorning && (
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  Mornings
                  <input
                    type="number"
                    min={1}
                    max={stay}
                    value={picked[extra.id]}
                    onChange={(e) => setMornings(extra, Number(e.target.value))}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">of {stay}</span>
                </label>
              )}

              <div className="w-20 text-right text-sm tabular-nums text-gray-900">
                {on ? formatMoney(extraTotal(extra, adults, picked[extra.id], stay)) : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {subtotal > 0 && (
        <div className="flex justify-between text-xs text-gray-600">
          <span>Extras</span>
          <span className="font-medium tabular-nums text-gray-900">{formatMoney(subtotal)}</span>
        </div>
      )}
    </div>
  )
}
