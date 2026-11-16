'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronUpIcon, ChevronDownIcon, EyeIcon, PlusIcon, TrashIcon,
  ArrowUturnLeftIcon, LockClosedIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  fetchEmailTemplates, saveEmailTemplate, resetEmailTemplate, previewEmailTemplate,
  saveEmailSchedule, fetchEmailOptOuts, removeEmailOptOut,
  type EmailTemplate, type EmailBlock, type EmailBlockKind,
  type EmailSchedule, type EmailOptOut,
} from '../../../lib/api'

// The emails the site sends, as the admin arranges them.
//
// Every one of them was written into the code, so changing a word meant a
// deploy. The layout is still ours -- a guest's receipt has to add up, and
// an invoice table is not something anybody should be typing by hand -- but
// which sections appear, in what order, and the writing in them is theirs.
//
// Sections marked with a padlock take their content from the booking. They
// can be moved and turned off; there is nothing in them to write.

/** How a field is asked for. Everything else is a single line. */
const LONG_FIELDS = new Set(['text'])

const FIELD_LABEL: Record<string, string> = {
  title: 'Title',
  subtitle: 'Line under the title',
  text: 'Text',
  heading: 'Heading',
  image: 'Picture (full address)',
  label: 'Button label',
  url: 'Where it goes',
  // The hotel's notice is one email with three occasions, so it carries
  // three wordings and the sender picks whichever happened.
  newText: 'When the booking is new',
  changedText: 'When it has been changed',
  cancelledText: 'When it has been cancelled',
  checkedInText: 'When the guest checks in online',
  checkedOutText: 'When the guest checks out online',
}

// ── When a timed email goes out ────────────────────────────────────────────
//
// Four of the emails are sent because a date arrived rather than because
// anybody did anything, and the owner asked to be able to move them.
//
// What can be moved is the day count and the hour. Which date it counts from,
// and whether it counts forwards or backwards, is the server's -- an email
// written around "you arrive tomorrow" does not become one sent after
// departure by typing in a box.

/** The sentence around the two boxes, so the admin reads what they are
 *  setting rather than working it out from a field called "days". */
const SCHEDULE_WORDS: Record<string, { before: string; after: string }> = {
  before: { before: 'Goes out', after: 'days before arrival, at' },
  after: { before: 'Goes out', after: 'days after departure, at' },
  on: { before: 'Goes out on the day of departure, at', after: '' },
}

/** The timing in a handful of words, for the badge in the list. */
const scheduleWords = (s: EmailSchedule) =>
  s.dir === 'on'
    ? `Departure day, ${s.time}`
    : s.dir === 'before'
      ? `${s.days} day${s.days === 1 ? '' : 's'} before, ${s.time}`
      : `${s.days} day${s.days === 1 ? '' : 's'} after, ${s.time}`

function ScheduleBox({
  kind, schedule, onSaved,
}: {
  kind: string
  schedule: EmailSchedule
  onSaved: (s: EmailSchedule) => void
}) {
  const [on, setOn] = useState(schedule.on)
  const [days, setDays] = useState(String(schedule.days))
  const [time, setTime] = useState(schedule.time)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  // Reopening a different email reuses this component, so the boxes have to
  // be refilled from whichever email is open now -- without this it would
  // keep showing the last one's hour.
  //
  // Only when the email changes, though. Watching the saved values instead
  // made saving wipe its own "Saved." the instant it appeared: the save
  // hands the new timing up to the list, the list hands it back down, and
  // this ran again.
  const lastKind = useRef(kind)
  useEffect(() => {
    if (lastKind.current === kind) return
    lastKind.current = kind
    setOn(schedule.on); setDays(String(schedule.days)); setTime(schedule.time); setNote('')
  }, [kind, schedule.on, schedule.days, schedule.time])

  const dirty =
    on !== schedule.on || Number(days) !== schedule.days || time !== schedule.time

  const save = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true); setNote('')
    try {
      const result = await saveEmailSchedule(token, kind, { on, days: Number(days) || 0, time })
      setNote(result.success ? 'Saved.' : result.message || 'Could not save that.')
      if (result.success && result.schedule) onSaved(result.schedule)
    } catch {
      setNote('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const words = SCHEDULE_WORDS[schedule.dir] || SCHEDULE_WORDS.before

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-amber-900">When it goes out</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            className="h-4 w-4 rounded border-amber-300 text-primary-600 focus:ring-primary-500"
          />
          {on ? 'Sending' : 'Switched off'}
        </label>
      </div>

      <div className={`mt-2 flex flex-wrap items-center gap-2 text-sm ${on ? 'text-amber-900' : 'text-amber-900/40'}`}>
        <span>{words.before}</span>

        {schedule.editDays && (
          <input
            type="number"
            min={0}
            max={90}
            value={days}
            disabled={!on}
            onChange={(e) => setDays(e.target.value)}
            className="w-16 rounded-md border border-amber-300 bg-white px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        )}

        {words.after && <span>{words.after}</span>}

        <input
          type="time"
          value={time}
          disabled={!on}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-md border border-amber-300 bg-white px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* The one thing that is easy to get wrong about these. */}
      <p className="mt-2 text-xs text-amber-800/80">
        That hour is read at each property, not here — 10:00 means ten in Amman for a Jordanian
        hotel and ten in Paris for a French one. Set each hotel&apos;s time zone on its own page.
      </p>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save timing'}
        </button>
        {note && <span className="text-xs text-amber-800">{note}</span>}
      </div>
    </div>
  )
}

// ── Who has asked not to be written to ─────────────────────────────────────
//
// The owner asked to be able to see this. A guest who unsubscribed and then
// hears from us anyway is annoyed twice, and the desk writing to them by hand
// is the way that happens.

/** Which email carried the link they pressed, in words. The server stores
 *  the kind, which reads like a column name. */
const SOURCE_WORDS: Record<string, string> = {
  offers_before_stay: 'Before the stay — offers',
  online_check_in: 'Day before — online check-in',
  online_check_out: 'Departure day — online check-out',
  thank_you: 'After the stay — thank you',
}

function OptOutTable({
  rows, loading, onPutBack,
}: {
  rows: EmailOptOut[]
  loading: boolean
  onPutBack: (row: EmailOptOut) => void
}) {
  const [find, setFind] = useState('')

  // Filtered here rather than at the server: the whole list is already in
  // hand, and a list this size is not worth a round trip per keystroke.
  const shown = useMemo(() => {
    const needle = find.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(needle) ||
        (SOURCE_WORDS[r.source || ''] || r.source || '').toLowerCase().includes(needle)
    )
  }, [rows, find])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Unsubscribed</h3>
        <p className="mt-1 text-sm text-gray-500">
          People who have asked to stop receiving the four timed emails. They still receive their
          booking confirmation, any change to it, their invoice and anything to do with their
          account — only the timed ones stop.
        </p>
      </div>

      {rows.length > 0 && (
        <input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="Search by address or email"
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-500">Reading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            Nobody has unsubscribed. The link sits at the foot of each timed email.
          </p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">Nothing matches “{find}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Email address</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Unsubscribed from</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">When</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                    <span className="sr-only">Put back on</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{row.email}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {/* Older rows may have none: the link only began
                          carrying which email it came from later. */}
                      {row.source ? SOURCE_WORDS[row.source] || row.source.replace(/_/g, ' ') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                      {new Date(row.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button
                        onClick={() => onPutBack(row)}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Put back on
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-gray-500">
          Put somebody back on only when they have asked you to. Writing to a person who
          unsubscribed is what makes them press “report spam” instead, and that costs the
          sending account.
        </p>
      )}
    </div>
  )
}

export default function EmailDesigner() {
  const [emails, setEmails] = useState<EmailTemplate[]>([])
  const [blockKinds, setBlockKinds] = useState<EmailBlockKind[]>([])
  const [tokens, setTokens] = useState<{ name: string; about: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Which email is open, and the arrangement being edited. Held apart from
  // the saved list so Cancel is simply closing it.
  const [open, setOpen] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  // The two halves of this screen. The emails themselves, and who has asked
  // not to receive the timed ones -- two different jobs, so two sub-tabs
  // rather than one of them tucked under the other.
  const [view, setView] = useState<'emails' | 'optouts'>('emails')

  // Held here rather than inside the table, because the count is on the tab
  // and the tab is drawn whichever half is showing.
  const [optOuts, setOptOuts] = useState<EmailOptOut[]>([])
  const [optOutsLoading, setOptOutsLoading] = useState(true)

  const loadOptOuts = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setOptOutsLoading(false); return }
    setOptOutsLoading(true)
    try {
      const result = await fetchEmailOptOuts(token)
      setOptOuts(result.optOuts || [])
    } finally {
      setOptOutsLoading(false)
    }
  }, [])

  useEffect(() => { loadOptOuts() }, [loadOptOuts])

  const putBack = async (row: EmailOptOut) => {
    if (!confirm(`Start sending the timed emails to ${row.email} again?`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    await removeEmailOptOut(token, row.id)
    await loadOptOuts()
  }

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    setLoading(true)
    try {
      const result = await fetchEmailTemplates(token)
      if (result.success) {
        setEmails(result.emails || [])
        setBlockKinds(result.blockKinds || [])
        setTokens(result.tokens || [])
        setError('')
      } else {
        setError(result.message || 'Could not read the emails.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const current = emails.find((e) => e.kind === open) || null
  const specOf = (type: string) => blockKinds.find((b) => b.type === type)

  /** The sections the admin may add to this email: the ones with writing in
   *  them, minus any already there that only make sense once. */
  const addable = useMemo(() => {
    if (!current) return []
    return blockKinds.filter(
      (b) => !b.locked && (!b.only || b.only.includes(current.kind)) &&
             (b.fields.length > 0) &&
             !['brand', 'banner', 'footer'].includes(b.type)
    )
  }, [blockKinds, current])

  const openEmail = (email: EmailTemplate) => {
    setOpen(email.kind)
    setSubject(email.subject)
    // Copied, not referenced: editing must not change the list behind it.
    setBlocks(email.blocks.map((b) => ({ ...b })))
    setExpanded(null)
    setNote('')
  }

  const move = (index: number, delta: number) => {
    const to = index + delta
    if (to < 0 || to >= blocks.length) return
    const next = [...blocks]
    const [moved] = next.splice(index, 1)
    next.splice(to, 0, moved)
    setBlocks(next)
    setExpanded(expanded === index ? to : expanded)
  }

  const setField = (index: number, field: string, value: string) =>
    setBlocks(blocks.map((b, i) => (i === index ? { ...b, [field]: value } : b)))

  const toggle = (index: number) =>
    setBlocks(blocks.map((b, i) => (i === index ? { ...b, on: !b.on } : b)))

  const remove = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index))
    setExpanded(null)
  }

  const add = (type: string) => {
    setBlocks([...blocks, { type, on: true }])
    setExpanded(blocks.length)
  }

  const onSave = async () => {
    if (!current) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    setNote('')
    try {
      const result = await saveEmailTemplate(token, current.kind, { subject, blocks })
      setNote(result.success ? 'Saved.' : result.message || 'Could not save that.')
      if (result.success) await load()
    } catch {
      setNote('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!current) return
    if (!confirm('Put this email back to how it came? Anything you have written here is lost.')) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    try {
      const result = await resetEmailTemplate(token, current.kind)
      setNote(result.success ? 'Back to the default.' : result.message || 'Could not reset that.')
      if (result.success) {
        const fresh = await fetchEmailTemplates(token)
        const got = (fresh.emails || []).find((e) => e.kind === current.kind)
        if (got) { setEmails(fresh.emails || []); setSubject(got.subject); setBlocks(got.blocks.map((b) => ({ ...b }))) }
      }
    } finally {
      setSaving(false)
    }
  }

  const onPreview = async () => {
    if (!current) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setPreviewing(true)
    try {
      const result = await previewEmailTemplate(token, current.kind, { subject, blocks })
      if (result.success) setPreview({ subject: result.subject || '', html: result.html || '' })
      else setNote(result.message || 'Could not draw that.')
    } catch {
      setNote('Unable to connect to server.')
    } finally {
      setPreviewing(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Reading the emails…</p>
  if (error) return <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      {/* ── The two halves ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ['emails', 'Emails', emails.length],
          ['optouts', 'Unsubscribed', optOutsLoading ? null : optOuts.length],
        ] as const).map(([id, name, count]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
              view === id
                ? 'border-primary-600 font-medium text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {name}
            {count !== null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                view === id ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === 'optouts' ? (
        <OptOutTable rows={optOuts} loading={optOutsLoading} onPutBack={putBack} />
      ) : (
        <>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Emails</h3>
        <p className="mt-1 text-sm text-gray-500">
          What the site sends, and how it is put together. The layout is fixed — a receipt has to
          add up — but you choose which sections appear, in what order, and what they say.
        </p>
      </div>

      {/* ── The list ── */}
      <div className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {emails.map((email) => (
          <div key={email.kind} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                {email.name}
                {email.custom && (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    Edited
                  </span>
                )}
                {/* Worth saying in the list: these four go out on their own,
                    which is not true of any of the others. */}
                {email.timed && email.schedule && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    email.schedule.on ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {email.schedule.on ? scheduleWords(email.schedule) : 'Switched off'}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{email.note}</p>
              <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{email.subject}</p>
            </div>
            <button
              onClick={() => openEmail(email)}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* ── The editor ── */}
      {current && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-medium text-gray-900">{current.name}</h4>
              <p className="mt-0.5 text-xs text-gray-500">{current.note}</p>
            </div>
            <button onClick={() => setOpen(null)} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Above the wording, because when an email goes out is the thing
              most likely to be wrong and the easiest to miss. Saved on its
              own button -- moving the hour is not rewriting the email, and
              a half-finished edit below should not go with it. */}
          {current.timed && current.schedule && (
            <ScheduleBox
              kind={current.kind}
              schedule={current.schedule}
              onSaved={(next) =>
                setEmails((list) =>
                  list.map((e) => (e.kind === current.kind ? { ...e, schedule: next } : e))
                )
              }
            />
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* What may be dropped into any writing. */}
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs font-medium text-gray-600">You can use these anywhere you write:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tokens.map((t) => (
                <span key={t.name} title={t.about}
                      className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-600 ring-1 ring-gray-200">
                  {`{{${t.name}}}`}
                </span>
              ))}
            </div>
          </div>

          {/* ── The sections ── */}
          <div className="space-y-2">
            {blocks.map((b, i) => {
              const spec = specOf(b.type)
              // A padlock means the content comes from the booking, not that
              // there is nothing to write: the heading above it is still
              // the admin's. Only what the section may carry decides.
              const writable = (spec?.fields || []).length > 0
              const isOpen = expanded === i
              return (
                <div key={`${b.type}-${i}`} className={`rounded-md border ${b.on ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex flex-col">
                      <button onClick={() => move(i, -1)} disabled={i === 0}
                              aria-label="Move up"
                              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-25">
                        <ChevronUpIcon className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1}
                              aria-label="Move down"
                              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-25">
                        <ChevronDownIcon className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>

                    <button
                      onClick={() => (writable ? setExpanded(isOpen ? null : i) : undefined)}
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${writable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`truncate text-sm ${b.on ? 'text-gray-900' : 'text-gray-400'}`}>
                        {spec?.label || b.type}
                      </span>
                      {spec?.locked && (
                        <span title="Its content comes from the booking — the heading is still yours" className="shrink-0 text-gray-300">
                          <LockClosedIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>

                    <label className="flex shrink-0 cursor-pointer items-center gap-2">
                      <span className="text-[11px] text-gray-400">{b.on ? 'Shown' : 'Hidden'}</span>
                      <div
                        onClick={() => toggle(i)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.on ? 'bg-primary-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${b.on ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </label>

                    {/* Only the ones the admin added themselves can go. The
                        built-in sections turn off instead, so an email can
                        always be put back together. */}
                    {!spec?.locked && !['brand', 'banner', 'footer'].includes(b.type) && (
                      <button onClick={() => remove(i)} aria-label="Remove section"
                              className="shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {isOpen && writable && (
                    <div className="space-y-3 border-t border-gray-100 px-3 py-3">
                      {(spec?.fields || []).map((field) => (
                        <div key={field}>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            {FIELD_LABEL[field] || field}
                          </label>
                          {LONG_FIELDS.has(field) ? (
                            <textarea
                              rows={3}
                              value={b[field as keyof EmailBlock] as string || ''}
                              onChange={(e) => setField(i, field, e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            <input
                              value={b[field as keyof EmailBlock] as string || ''}
                              onChange={(e) => setField(i, field, e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Adding one ── */}
          {addable.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">Add a section:</span>
              {addable.map((b) => (
                <button key={b.type} onClick={() => add(b.type)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-50">
                  <PlusIcon className="h-3.5 w-3.5" /> {b.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <button onClick={onSave} disabled={saving}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={onPreview} disabled={previewing}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <EyeIcon className="h-4 w-4" /> {previewing ? 'Drawing…' : 'Preview'}
            </button>
            {current.custom && (
              <button onClick={onReset} disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ArrowUturnLeftIcon className="h-4 w-4" /> Back to default
              </button>
            )}
            {note && <span className="text-sm text-gray-500">{note}</span>}
          </div>
        </div>
      )}

      {/* ── What it would look like ──
          In an iframe, because the email brings its own styling and must not
          be allowed to reach the panel's. Drawn against a made-up booking:
          a preview that reached for a real guest's stay would be showing
          somebody's name and money to whoever happened to be editing. */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
             onClick={() => setPreview(null)}>
          <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">Subject</p>
                <p className="truncate text-sm font-medium text-gray-900">{preview.subject}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Drawn against a made-up booking. Nothing was sent.</p>
              </div>
              <button onClick={() => setPreview(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-full w-full flex-1 border-0 bg-gray-100"
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
