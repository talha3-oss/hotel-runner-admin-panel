'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

// Which clock a property keeps.
//
// A plain <select> of four hundred zones only jumps to what you type from
// the start of the name, so finding Paris means knowing it is filed under
// Europe. This searches the whole name and the city at the end of it, so
// "paris", "europe" and "fr" all reach Europe/Paris.
//
// The list is the runtime's own through Intl, not one of ours to go stale.

const ZONES: string[] = (() => {
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf?.('timeZone')
    if (all?.length) return all
  } catch { /* older browser */ }
  return ['Asia/Amman', 'Europe/Paris', 'Europe/Dublin', 'Europe/London', 'UTC']
})()

/** What the clock says there right now, so whoever picks a zone can see at
 *  once whether they have picked the right one. */
export function clockNow(zone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date())
  } catch {
    return '—'
  }
}

/** "Europe/Paris" → "Paris", which is what somebody is actually looking for.
 *  Underscores are how IANA writes a space. */
const cityOf = (zone: string) => zone.split('/').pop()!.replace(/_/g, ' ')

export default function TimezonePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (zone: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const searchBox = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  // Four hundred zones is not a list anybody scrolls, so the search takes
  // focus the moment it opens.
  useEffect(() => {
    if (open) searchBox.current?.focus()
    else setQuery('')
  }, [open])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!q) return ZONES
    // The city first, so "paris" puts Europe/Paris above America/Paris only
    // by accident of order rather than by rank -- which is close enough for
    // a list this short once it is filtered.
    return ZONES.filter(
      (z) => cityOf(z).toLowerCase().includes(q) || z.toLowerCase().replace(/_/g, ' ').includes(q)
    )
  }, [query])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className="truncate">{value || 'Choose a time zone'}</span>
        <span className="flex shrink-0 items-center gap-2 text-gray-400">
          <span className="tabular-nums">{clockNow(value)}</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={searchBox}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city or region — paris, amman, europe"
              className="w-full text-sm focus:outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {shown.map((zone) => (
              <li key={zone}>
                <button
                  type="button"
                  onClick={() => { onChange(zone); setOpen(false) }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                    zone === value ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-800'
                  }`}
                >
                  <span className="min-w-0 truncate">{zone}</span>
                  <span className="shrink-0 text-xs text-gray-400 tabular-nums">{clockNow(zone)}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400">No zone matches that.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
