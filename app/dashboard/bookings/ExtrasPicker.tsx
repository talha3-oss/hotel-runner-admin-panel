'use client'

// The add-ons on a booking, room by room.
//
// An add-on belongs to a room: breakfast for the two in the King and not for
// the one in the Twin, priced over the people in that room rather than over
// the whole booking. The property decides which rooms sell which add-ons
// (Extras → the add-on → Rooms); an add-on that names no rooms is sold with
// all of them.
//
// Shared by the new-booking page and the editor on a booking's own page, for
// the same reason the room picker is: two forms that price the same thing
// must not disagree about how.
//
// What is held is the add-on's id, which room it is for, and how many
// mornings. The money is worked out from that -- never stored -- so moving
// the dates or putting another adult in a room moves the totals with it
// instead of leaving behind a figure that was true an hour ago.

import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { formatMoney } from '../../../lib/currency'

export type ExtraPriceType = 'per adult per morning' | 'per booking'

export interface HotelExtra {
  id: string
  name: string
  description: string
  price: number
  priceType: ExtraPriceType
  /** The room codes it is sold with. Empty is every room. */
  rooms: string[]
}

/** One of the booking's rooms, as the extras are priced over it. */
export interface ExtrasRoom {
  index: number
  code: string
  name: string
  adults: number
}

/** One add-on taken for one room. The same add-on in two rooms is two
 *  entries, because the two are priced apart. */
export interface PickedExtra {
  id: string
  roomIndex: number
  mornings: number
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(Math.round(Number(value) || low), low), Math.max(low, high))

const codesOf = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const value of raw) {
    const code = String(value || '').trim()
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}

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
      rooms: codesOf(row.rooms),
    })
  })
  return out
}

/** Whether a room sells this add-on. Naming no rooms means all of them. */
export const soldWith = (extra: HotelExtra, room: ExtrasRoom) =>
  extra.rooms.length === 0 ||
  extra.rooms.some((code) => code.trim().toLowerCase() === room.code.trim().toLowerCase())

/** What one add-on comes to in one room. The same arithmetic the server
 *  does, so the figure on screen is the figure that gets written. */
export function extraTotal(
  extra: HotelExtra, room: ExtrasRoom, mornings: number, nights: number
): number {
  if (extra.priceType === 'per booking') return extra.price
  return extra.price * Math.max(1, room.adults) * clamp(mornings, 1, Math.max(1, nights))
}

/** What goes in the request. The server matches on the id, checks the room
 *  sells it, re-reads the property's own price and prices it over whoever is
 *  in that room -- so nothing here can invent a price. */
export function extrasPayload(
  extras: HotelExtra[], rooms: ExtrasRoom[], picked: PickedExtra[], nights: number
): { id: string; name: string; roomIndex: number; mornings: number; total: number }[] {
  const out: { id: string; name: string; roomIndex: number; mornings: number; total: number }[] = []
  for (const choice of picked) {
    const extra = extras.find((e) => e.id === choice.id)
    const room = rooms[choice.roomIndex]
    if (!extra || !room || !soldWith(extra, room)) continue
    out.push({
      id: extra.id,
      name: extra.name,
      roomIndex: room.index,
      mornings: clamp(choice.mornings, 1, Math.max(1, nights)),
      total: extraTotal(extra, room, choice.mornings, nights),
    })
  }
  return out
}

/** What a booking already has on it, as something this form can edit. Read
 *  back by name as well as id, because an add-on renamed since the booking
 *  was taken still has its id. A booking from before add-ons belonged to a
 *  room carries no roomIndex; it is put in the first room, which is where a
 *  single-room booking's add-on already was. */
export function pickedFromBooking(
  extras: HotelExtra[],
  on: { id?: string; name?: string; total?: number; mornings?: number | null; roomIndex?: number | null }[] | undefined,
  rooms: ExtrasRoom[],
  nights: number
): PickedExtra[] {
  const out: PickedExtra[] = []
  for (const had of Array.isArray(on) ? on : []) {
    const key = String(had?.id || '').trim().toLowerCase()
    const name = String(had?.name || '').trim().toLowerCase()
    const extra = extras.find(
      (e) => e.id.toLowerCase() === key || e.name.toLowerCase() === name
    )
    if (!extra) continue

    const asked = had?.roomIndex
    const roomIndex =
      typeof asked === 'number' && Number.isInteger(asked) && asked >= 0 && asked < rooms.length
        ? asked
        : 0
    const room = rooms[roomIndex]
    if (!room || !soldWith(extra, room)) continue
    if (out.some((p) => p.id === extra.id && p.roomIndex === roomIndex)) continue

    let mornings = Math.max(1, nights)
    if (extra.priceType === 'per adult per morning') {
      const said = Number(had?.mornings)
      if (Number.isFinite(said) && said > 0) {
        mornings = clamp(said, 1, Math.max(1, nights))
      } else {
        // A booking from before the mornings were written down: read them
        // back out of what it was billed.
        const each = extra.price * Math.max(1, room.adults)
        const billed = Number(had?.total)
        if (each > 0 && Number.isFinite(billed) && billed > 0) {
          mornings = clamp(billed / each, 1, Math.max(1, nights))
        }
      }
    }
    out.push({ id: extra.id, roomIndex, mornings })
  }
  return out
}

export function ExtrasPicker({
  extras, rooms, picked, nights, onChange,
}: {
  extras: HotelExtra[]
  rooms: ExtrasRoom[]
  picked: PickedExtra[]
  nights: number
  onChange: (picked: PickedExtra[]) => void
}) {
  const stay = Math.max(1, nights)

  // One room open at a time's worth of room -- six add-ons across three rooms
  // filled the page and pushed the payment and the Check button off the
  // bottom. The first is open because that is the one being filled in; the
  // rest say what they hold and open on a press.
  //
  // A room that already has something chosen opens too, so reopening a
  // booking to change it does not hide what is on it.
  const [open, setOpen] = useState<number[]>([0])
  useEffect(() => {
    setOpen((prev) => {
      const next = prev.slice()
      for (const choice of picked) {
        if (!next.includes(choice.roomIndex)) next.push(choice.roomIndex)
      }
      return next.length === prev.length ? prev : next
    })
    // Only when what is on the booking changes -- not on every keystroke
    // somewhere else on the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked.length])

  const subtotal = useMemo(() => {
    let sum = 0
    for (const choice of picked) {
      const extra = extras.find((e) => e.id === choice.id)
      const room = rooms[choice.roomIndex]
      if (extra && room) sum += extraTotal(extra, room, choice.mornings, stay)
    }
    return sum
  }, [extras, rooms, picked, stay])

  if (rooms.length === 0) return null

  if (extras.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
        This property has no extras set up. They are added under Extras.
      </div>
    )
  }

  const chosen = (id: string, roomIndex: number) =>
    picked.find((p) => p.id === id && p.roomIndex === roomIndex)

  const toggle = (extra: HotelExtra, room: ExtrasRoom) => {
    const on = chosen(extra.id, room.index)
    onChange(on
      ? picked.filter((p) => !(p.id === extra.id && p.roomIndex === room.index))
      : [...picked, { id: extra.id, roomIndex: room.index, mornings: stay }])
  }

  const setMornings = (extra: HotelExtra, room: ExtrasRoom, value: number) => {
    onChange(picked.map((p) =>
      p.id === extra.id && p.roomIndex === room.index
        ? { ...p, mornings: clamp(value, 1, stay) }
        : p))
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-600">Extras</div>

      <div className="space-y-2">
        {rooms.map((room) => {
          const forThisRoom = extras.filter((extra) => soldWith(extra, room))
          const isOpen = open.includes(room.index)
          const mine = picked.filter((p) => p.roomIndex === room.index)
          const roomTotal = mine.reduce((sum, choice) => {
            const extra = extras.find((e) => e.id === choice.id)
            return extra ? sum + extraTotal(extra, room, choice.mornings, stay) : sum
          }, 0)
          return (
            <div key={room.index} className="rounded-md border border-gray-200">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((prev) =>
                  prev.includes(room.index)
                    ? prev.filter((i) => i !== room.index)
                    : [...prev, room.index])}
                className="flex w-full items-center gap-2 rounded-t-md border-b border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
                  <ChevronDownIcon
                    className={`h-3 w-3 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                    strokeWidth={3}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700">
                  Room {room.index + 1} — {room.name || room.code}
                </span>
                {/* What is on this room, said on the header, so a closed one
                    is not a room whose add-ons have been forgotten. */}
                {mine.length > 0 && (
                  <span className="shrink-0 text-xs font-medium tabular-nums text-primary-700">
                    {mine.length} · {formatMoney(roomTotal)}
                  </span>
                )}
                <span className="shrink-0 text-xs text-gray-500">
                  {room.adults} adult{room.adults === 1 ? '' : 's'}
                </span>
              </button>

              {!isOpen ? null : forThisRoom.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Nothing is sold with this room.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {forThisRoom.map((extra) => {
                    const on = chosen(extra.id, room.index)
                    const byMorning = extra.priceType === 'per adult per morning'
                    return (
                      <div
                        key={extra.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2"
                      >
                        <label className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!on}
                            onChange={() => toggle(extra, room)}
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
                              value={on.mornings}
                              onChange={(e) => setMornings(extra, room, Number(e.target.value))}
                              className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                            <span className="text-gray-400">of {stay}</span>
                          </label>
                        )}

                        <div className="w-20 text-right text-sm tabular-nums text-gray-900">
                          {on ? formatMoney(extraTotal(extra, room, on.mornings, stay)) : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
