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

export type ExtraPriceType = 'per adult per day' | 'per booking'

export interface HotelExtra {
  id: string
  name: string
  description: string
  price: number
  priceType: ExtraPriceType
  /** On the booking but no longer in the property's own list. It can be
   *  taken off, and not put back. */
  retired?: boolean
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
  /** How many of the room's party it is for. The room's whole party unless
   *  the guest said otherwise -- a bouquet is usually for one of a couple. */
  people: number
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
      // The wording changed on 2026-11-15. Both spellings are read and only
      // the new one is written, so nothing had to be migrated.
      priceType: row.priceType === 'per adult per day' || row.priceType === 'per adult per morning'
        ? 'per adult per day'
        : 'per booking',
      rooms: codesOf(row.rooms),
    })
  })
  return out
}

/** The property's add-ons, plus anything this booking has that is no longer
 *  among them.
 *
 *  A property that stops offering an add-on, or renames one past recognising,
 *  must not thereby take it off a stay somebody has already paid for. The
 *  booking's own record carries everything needed to draw it -- what it was
 *  called, what it cost, how it was priced -- so it is read from there, and
 *  sold with every room, because the question of what it is sold with is
 *  about adding one, not keeping one.
 *
 *  Marked `retired` so the editor can say what it is: a thing that may be
 *  taken off, but not put back once it has been. */
export function extrasWithBooked(
  offered: HotelExtra[],
  on: { id?: string; name?: string; price?: number; priceType?: string; description?: string }[] | undefined
): HotelExtra[] {
  const out = offered.slice()
  for (const had of Array.isArray(on) ? on : []) {
    const id = String(had?.id || '').trim()
    const name = String(had?.name || '').trim()
    if (!id && !name) continue
    const known = out.some(
      (e) => e.id.toLowerCase() === id.toLowerCase() || e.name.toLowerCase() === name.toLowerCase()
    )
    if (known) continue

    const price = Number(had?.price)
    out.push({
      id: id || name,
      name: name || id,
      description: String(had?.description || '').trim(),
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      priceType: had?.priceType === 'per adult per day' || had?.priceType === 'per adult per morning'
        ? 'per adult per day'
        : 'per booking',
      rooms: [],
      retired: true,
    })
  }
  return out
}

/** Whether a room sells this add-on. Naming no rooms means all of them. */
export const soldWith = (extra: HotelExtra, room: ExtrasRoom) =>
  extra.rooms.length === 0 ||
  extra.rooms.some((code) => code.trim().toLowerCase() === room.code.trim().toLowerCase())

/** What one add-on comes to in one room. The same arithmetic the server
 *  does, so the figure on screen is the figure that gets written. */
export function extraTotal(
  extra: HotelExtra, room: ExtrasRoom, mornings: number, nights: number, people?: number
): number {
  if (extra.priceType === 'per booking') return extra.price
  const party = Math.max(1, room.adults)
  // Nothing said is everybody, which is every add-on taken before the guest
  // could choose -- and what the server assumes too.
  const heads = clamp(people && people > 0 ? people : party, 1, party)
  return extra.price * heads * clamp(mornings, 1, Math.max(1, nights))
}

/** What goes in the request. The server matches on the id, checks the room
 *  sells it, re-reads the property's own price and prices it over whoever is
 *  in that room -- so nothing here can invent a price. */
export function extrasPayload(
  extras: HotelExtra[], rooms: ExtrasRoom[], picked: PickedExtra[], nights: number
): { id: string; name: string; roomIndex: number; mornings: number; people: number; total: number }[] {
  const out: { id: string; name: string; roomIndex: number; mornings: number; people: number; total: number }[] = []
  for (const choice of picked) {
    const extra = extras.find((e) => e.id === choice.id)
    const room = rooms[choice.roomIndex]
    // No soldWith here. Everything in `picked` is either on the booking
    // already or was just ticked in a list that applied the rule -- and
    // dropping something the admin can see ticked, without saying so, is
    // how the guest's dinner went missing on an unrelated date change.
    if (!extra || !room) continue
    out.push({
      id: extra.id,
      name: extra.name,
      roomIndex: room.index,
      mornings: clamp(choice.mornings, 1, Math.max(1, nights)),
      people: clamp(choice.people || room.adults, 1, Math.max(1, room.adults)),
      total: extraTotal(extra, room, choice.mornings, nights, choice.people),
    })
  }
  return out
}

/** The add-ons after a room has been taken off the booking.
 *
 *  An add-on names its room by position, so removing a room shifts every
 *  room below it up one and leaves the add-ons pointing at the wrong ones.
 *  What that did, on a four-room booking where room 3 was removed: room 3's
 *  own add-on stayed and was still charged, now described as room 4's, while
 *  room 4's add-on pointed past the end of the list and was dropped without
 *  a word. The booking's total went out 25 JOD short and the property was
 *  told to lay on the wrong thing in the wrong room.
 *
 *  So the add-ons for the room that went are dropped, and everything below
 *  it moves up with its room.
 */
export function pickedAfterRemoval(picked: PickedExtra[], removedAt: number): PickedExtra[] {
  return picked
    .filter((p) => p.roomIndex !== removedAt)
    .map((p) => (p.roomIndex > removedAt ? { ...p, roomIndex: p.roomIndex - 1 } : p))
}

/** What a booking already has on it, as something this form can edit. Read
 *  back by name as well as id, because an add-on renamed since the booking
 *  was taken still has its id. A booking from before add-ons belonged to a
 *  room carries no roomIndex; it is put in the first room, which is where a
 *  single-room booking's add-on already was. */
export function pickedFromBooking(
  extras: HotelExtra[],
  on: { id?: string; name?: string; total?: number; mornings?: number | null; people?: number | null; roomIndex?: number | null }[] | undefined,
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
    // Only that the room exists. Whether it still *sells* this add-on is a
    // rule about what may be added; the guest has already bought this one,
    // and the property's list may have changed since. It used to be checked
    // here, and an add-on sold with one room type vanished from the editor
    // the moment the panel could not work out the room's code.
    if (!room) continue
    if (out.some((p) => p.id === extra.id && p.roomIndex === roomIndex)) continue

    // How many people it was taken for. A booking from before the guest
    // could choose says nothing, and those were for the whole room.
    const saidPeople = Number(had?.people)
    const people = Number.isFinite(saidPeople) && saidPeople > 0
      ? clamp(saidPeople, 1, Math.max(1, room.adults))
      : Math.max(1, room.adults)

    let mornings = Math.max(1, nights)
    if (extra.priceType === 'per adult per day') {
      const said = Number(had?.mornings)
      if (Number.isFinite(said) && said > 0) {
        mornings = clamp(said, 1, Math.max(1, nights))
      } else {
        // A booking from before the days were written down: read them back
        // out of what it was billed, over the people it was billed for.
        const each = extra.price * people
        const billed = Number(had?.total)
        if (each > 0 && Number.isFinite(billed) && billed > 0) {
          mornings = clamp(billed / each, 1, Math.max(1, nights))
        }
      }
    }
    out.push({ id: extra.id, roomIndex, mornings, people })
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
      if (extra && room) sum += extraTotal(extra, room, choice.mornings, stay, choice.people)
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
      : [...picked, { id: extra.id, roomIndex: room.index, mornings: stay, people: Math.max(1, room.adults) }])
  }

  const setPeople = (extra: HotelExtra, room: ExtrasRoom, value: number) => {
    onChange(
      picked.map((p) =>
        p.id === extra.id && p.roomIndex === room.index
          ? { ...p, people: clamp(value, 1, Math.max(1, room.adults)) }
          : p
      )
    )
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
          // What this room sells -- plus anything already chosen for it,
          // which may be something the room no longer sells or the property
          // no longer offers. Leaving those out hid a charge the guest had
          // paid, with no way to take it off.
          const forThisRoom = extras.filter(
            (extra) =>
              soldWith(extra, room) ||
              picked.some((p) => p.id === extra.id && p.roomIndex === room.index)
          )
          const isOpen = open.includes(room.index)
          const mine = picked.filter((p) => p.roomIndex === room.index)
          const roomTotal = mine.reduce((sum, choice) => {
            const extra = extras.find((e) => e.id === choice.id)
            return extra ? sum + extraTotal(extra, room, choice.mornings, stay, choice.people) : sum
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
                    const byDay = extra.priceType === 'per adult per day'
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
                            <span className="block truncate text-sm text-gray-900">
                              {extra.name}
                              {/* On the booking but not on the property's
                                  list any more, or not sold with this room.
                                  Said plainly, because it can be taken off
                                  and not put back on. */}
                              {(extra.retired || !soldWith(extra, room)) && (
                                <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                  {extra.retired ? 'no longer offered' : 'not sold with this room'}
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {formatMoney(extra.price)}{' '}
                              {byDay ? 'per adult, per day' : 'per booking'}
                              {(extra.retired || !soldWith(extra, room)) && ' — already on this booking'}
                            </span>
                          </span>
                        </label>

                        {on && byDay && (
                          <>
                            <label className="flex items-center gap-1.5 text-xs text-gray-600">
                              Days
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
                            {/* Who it is for. Everybody in the room unless
                                somebody says otherwise -- a bouquet is
                                usually for one of a couple, and charging
                                for two was simply wrong. */}
                            <label className="flex items-center gap-1.5 text-xs text-gray-600">
                              People
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, room.adults)}
                                value={on.people}
                                onChange={(e) => setPeople(extra, room, Number(e.target.value))}
                                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                              />
                              <span className="text-gray-400">of {Math.max(1, room.adults)}</span>
                            </label>
                          </>
                        )}

                        <div className="w-20 text-right text-sm tabular-nums text-gray-900">
                          {on ? formatMoney(extraTotal(extra, room, on.mornings, stay, on.people)) : '—'}
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
