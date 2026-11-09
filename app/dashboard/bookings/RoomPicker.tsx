'use client'

// The rooms on a booking, and who is in each of them.
//
// Written for the editor on a booking's own page, and used unchanged by the
// new-booking form -- the client asked for the two to be the same thing, and
// a second copy of a form this size is a second copy of its bugs.

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { partyLabel, RoomParty } from './shared'

export type RoomLimits = { adults: number; underSix: number; olderChildren: number; persons: number }

export type RoomOption = {
  id: string
  name: string
  roomNumber: string
  planName: string
  planCode: string
  /** Which property the room belongs to. The editor works inside one booking
   *  and never needs it; the new-booking form shows only the rooms of the
   *  hotel being booked. */
  hotelId?: string
}

/** One line in the room dropdown: the code, the room, and the plan it is
 *  sold on. The same text the search matches against, so what an admin can
 *  read is what they can type. */
export function roomOptionLabel(r: RoomOption): string {
  const plan = r.planName ? ` · ${r.planCode ? `${r.planCode} ` : ''}${r.planName}` : ''
  return `${r.roomNumber} — ${r.name}${plan}`
}

/** Which room, chosen by typing rather than by scrolling.
 *
 *  A property with a dozen room types sold on four plans each is fifty lines
 *  in a native <select>, every one of them beginning with the same words --
 *  so finding "the twin on half-board" meant reading the list. This is the
 *  same control with a search box in it.
 *
 *  Every word typed has to appear somewhere in the line, in any order, so
 *  "twin half" finds the half-board twin without knowing which comes first. */
export function RoomPicker({ value, options, onPick }: {
  value: string
  options: RoomOption[]
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    // The search box is the point of opening it, so it already has the cursor.
    field.current?.focus()
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const current = options.find((r) => r.id === value)
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const matches = options.filter((r) => {
    const line = roomOptionLabel(r).toLowerCase()
    return words.every((w) => line.includes(w))
  })

  const choose = (id: string) => { onPick(id); setOpen(false); setQuery('') }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-left text-sm text-gray-900"
      >
        <span className="truncate">{current ? roomOptionLabel(current) : value}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-2.5 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={field}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Enter on a single match is the quickest way out of here, and
              // typing enough to leave one match is the usual case.
              onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) choose(matches[0].id) }}
              placeholder="Search room or plan…"
              className="w-full border-0 p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            />
          </div>

          <div className="max-h-64 overflow-auto py-1">
            {matches.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">Nothing matches “{query}”.</p>
            ) : matches.map((r) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={r.id === value}
                onClick={() => choose(r.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  r.id === value ? 'text-primary-700' : 'text-gray-700'
                }`}
              >
                <span className="flex-1 truncate">{roomOptionLabel(r)}</span>
                {r.id === value && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** One room a night is being sold for, and the party in it.
 *
 *  The rule is applied to each room on its own -- an empty place in one room
 *  is no use to a child sleeping in another -- so the party is edited here
 *  and the totals are read off it. */
export function RoomLines({ roomIds, occupancy, options, limits, adultMinAge, onChange }: {
  roomIds: string[]
  occupancy: RoomParty[]
  options: RoomOption[]
  limits: RoomLimits
  adultMinAge: number
  onChange: (roomIds: string[], occupancy: RoomParty[]) => void
}) {
  const totals = {
    adults: occupancy.reduce((sum, r) => sum + r.adults, 0),
    underSix: occupancy.reduce((sum, r) => sum + r.underSix, 0),
    olderChildren: occupancy.reduce((sum, r) => sum + r.olderChildren, 0),
  }

  const setCount = (index: number, key: keyof RoomParty, value: number) => {
    const floor = key === 'adults' ? 1 : 0
    onChange(
      roomIds,
      occupancy.map((room, i) =>
        i === index ? { ...room, [key]: Math.max(floor, Math.floor(Number(value) || 0)) } : room
      )
    )
  }

  const problemIn = (room: RoomParty) => {
    const people = room.adults + room.underSix + room.olderChildren
    if (room.adults > limits.adults) return `${room.adults} adults — a room here takes ${limits.adults}.`
    if (room.olderChildren > limits.olderChildren) return `${room.olderChildren} children of 6–${adultMinAge - 1} — a room here takes ${limits.olderChildren}.`
    if (room.underSix > limits.underSix) return `${room.underSix} under 6 — a room here takes ${limits.underSix}.`
    if (people > limits.persons) return `${people} people — a room here takes ${limits.persons}.`
    return null
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium text-gray-700">Rooms and who is in them</h3>
        <p className="text-[11px] text-gray-400">
          a room here takes {limits.adults} adults, {limits.underSix} under 6,{' '}
          {limits.olderChildren} aged 6–{adultMinAge - 1}, {limits.persons} people in all
        </p>
      </div>

      <div className="mt-2 space-y-1">
        <div className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] gap-2 text-[11px] text-gray-400">
          <span>Room</span><span>Adults</span><span>Under 6</span><span>6–{adultMinAge - 1}</span><span />
        </div>

        {roomIds.map((id, i) => {
          const room = occupancy[i] || { adults: 1, underSix: 0, olderChildren: 0 }
          const problem = problemIn(room)
          return (
            <div key={`${id}-${i}`}>
              <div className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] gap-2">
                <RoomPicker
                  value={id}
                  options={options}
                  onPick={(picked) => {
                    const next = [...roomIds]
                    next[i] = picked
                    onChange(next, occupancy)
                  }}
                />

                {([['adults', room.adults, 1], ['underSix', room.underSix, 0], ['olderChildren', room.olderChildren, 0]] as const).map(
                  ([key, value, floor]) => (
                    <input
                      key={key}
                      type="number"
                      min={floor}
                      value={value}
                      onChange={(e) => setCount(i, key, Number(e.target.value))}
                      className={`rounded-md border px-2 py-1.5 text-sm ${problem ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                    />
                  )
                )}

                <button
                  onClick={() => onChange(roomIds.filter((_, j) => j !== i), occupancy.filter((_, j) => j !== i))}
                  disabled={roomIds.length <= 1}
                  className="rounded px-2 text-xs text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent"
                >
                  Remove
                </button>
              </div>
              {problem && <p className="mt-0.5 text-[11px] text-amber-700">Room {i + 1}: {problem}</p>}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <button
          onClick={() => {
            const first = options[0]?.id || roomIds[0]
            if (!first) return
            onChange([...roomIds, first], [...occupancy, { adults: 1, underSix: 0, olderChildren: 0 }])
          }}
          className="text-xs text-primary-600 hover:underline"
        >
          + Add room
        </button>
        <span className="text-[11px] text-gray-500">{partyLabel(totals, adultMinAge)}</span>
      </div>
    </div>
  )
}
