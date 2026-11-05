// What the bookings list and one booking's page both need to say.
//
// They were one file until the detail outgrew a modal. These live here rather
// than in either of them so the two cannot start describing the same booking
// differently -- a badge that reads Sent on the list and Pending on the page
// is worse than no badge at all.

export const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export const PAYMENT_COLORS: Record<string, string> = {
  PAID: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-600',
}

// Whether RateTiger was told about this booking. Until they know, their
// channels keep offering a room that is already sold — so a booking stuck at
// Pending is a double-booking waiting to happen, not a cosmetic detail.
export const RT_LABELS: Record<string, string> = {
  SENT: 'Sent',
  PENDING: 'Pending',
  FAILED: 'Failed',
  SKIPPED: 'Not connected',
}

export const RT_COLORS: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
}

export const RT_HINTS: Record<string, string> = {
  SENT: 'RateTiger has this booking.',
  PENDING: 'Not delivered yet — it is retried automatically every few minutes.',
  FAILED: 'RateTiger refused it. Retrying will not help; see the reason.',
  SKIPPED: 'This property has no RateTiger hotel code, so nothing is sent.',
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

export function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export type RoomParty = { adults: number; underSix: number; olderChildren: number }

/** Who is in each booked room.
 *
 *  A booking taken since 2026-11-05 carries its own arrangement. An older one
 *  carries none, so the party is spread as evenly as it divides -- which is a
 *  guess, and the page says so rather than presenting it as fact. */
export function partyPerRoom(
  booking: { adults: number; childrenAges?: string[]; children?: number; roomOccupancy?: RoomParty[] | null },
  roomCount: number
): { rooms: RoomParty[]; recorded: boolean } {
  const count = Math.max(1, roomCount)
  const stored = Array.isArray(booking.roomOccupancy) ? booking.roomOccupancy : null

  if (stored && stored.length === count) {
    return {
      recorded: true,
      rooms: stored.map((r) => ({
        adults: Math.max(1, Number(r.adults) || 1),
        underSix: Math.max(0, Number(r.underSix) || 0),
        olderChildren: Math.max(0, Number(r.olderChildren) || 0),
      })),
    }
  }

  const ages = Array.isArray(booking.childrenAges) ? booking.childrenAges : []
  const older = ages.filter((a) => a === '6-12').length
  const younger = ages.length > 0 ? ages.length - older : Number(booking.children) || 0
  const adults = Math.max(count, Number(booking.adults) || 1)

  const share = (total: number, floor: number) =>
    Array.from({ length: count }, (_, i) =>
      Math.max(floor, Math.floor(total / count) + (i < total % count ? 1 : 0))
    )

  const a = share(adults, 1)
  const o = share(older, 0)
  const u = share(younger, 0)
  return { recorded: false, rooms: a.map((_, i) => ({ adults: a[i], underSix: u[i], olderChildren: o[i] })) }
}

/** "2 adults, 1 child aged 6–12, 1 under 6" — whoever is actually there. */
export function partyLabel(party: RoomParty, adultMinAge = 13) {
  return [
    `${party.adults} adult${party.adults === 1 ? '' : 's'}`,
    party.olderChildren > 0
      ? `${party.olderChildren} child${party.olderChildren === 1 ? '' : 'ren'} aged 6–${adultMinAge - 1}`
      : null,
    party.underSix > 0 ? `${party.underSix} under 6` : null,
  ]
    .filter(Boolean)
    .join(', ')
}
