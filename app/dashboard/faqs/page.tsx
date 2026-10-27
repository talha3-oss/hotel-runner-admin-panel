'use client'

import RichTextEditor from '../../../components/RichTextEditor'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ChevronUpDownIcon, ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import {
  Faq,
  FaqPayload,
  Hotel,
  copyFaqsFromSite,
  createAdminFaq,
  deleteAdminFaq,
  fetchAdminFaqs,
  fetchHotels,
  resetFaqsToSite,
  updateAdminFaq,
  saveFaqCta,
} from '../../../lib/api'

type FormState = FaqPayload & { id: string }

/** The answer is HTML now, and this row wants one line of it — tags and all
 *  the entities they bring would otherwise be shown as text. */
function plainText(html: string) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const EMPTY: FormState = { id: '', question: '', answer: '', category: '', sortOrder: 0, isActive: true }

const CATEGORIES = ['Reservations', 'Dining', 'Services', 'Facilities', 'Policies', 'Accessibility', 'General']

interface FaqCta {
  title: string
  text: string
  buttonLabel: string
  buttonHref: string
  enabled: boolean
}

const DEFAULT_CTA: FaqCta = {
  title: 'Still have questions?',
  text: 'Our team is available 24/7 to help you with anything you need.',
  buttonLabel: 'Contact Us',
  buttonHref: '/contact',
  enabled: true,
}

const ctaInput = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [filterCategory, setFilterCategory] = useState('all')

  // The block at the foot of the FAQ page on the site. All three bits of it
  // were written into that page, and its button pointed at "/" -- so a
  // Contact Us button took the guest to the home page.
  const [cta, setCta] = useState(DEFAULT_CTA)
  const [ctaDirty, setCtaDirty] = useState(false)
  const [ctaSaving, setCtaSaving] = useState(false)

  // Whose questions are being edited: '' is the site-wide list, or a hotel's
  // id for that hotel's own. A hotel with none of its own shows the site-wide
  // list on its page, so most hotels never need one.
  const [scope, setScope] = useState('')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [inherited, setInherited] = useState(false)
  const [scopeBusy, setScopeBusy] = useState(false)

  // The list for the picker. Read-only, so a failure here costs nothing more
  // than the site-wide list being the only one on offer.
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    fetchHotels(token).then(r => { if (r.success) setHotels(r.hotels || []) }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await fetchAdminFaqs(token, scope)
      if (result.success) {
        setFaqs(result.faqs || [])
        setInherited(!!result.inheritedFromSite)
        if (result.cta) { setCta({ ...DEFAULT_CTA, ...result.cta }); setCtaDirty(false) }
      }
      else setError(result.message || 'Failed to load FAQs.')
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => { load() }, [load])

  const currentHotel = hotels.find(h => h.id === scope)

  // Where this list is read on the site. Worth showing: the per-hotel page is
  // new, and nothing else on this screen would say the address exists.
  const publicPath = scope
    ? `/hotels/${currentHotel?.slug || scope}/faqs`
    : '/faqs'

  const copyFromSite = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token || !scope) return
    if (!confirm(`Copy the site-wide questions onto ${currentHotel?.name || 'this hotel'}?\n\nYou can then edit or delete them without touching the site-wide list.`)) return
    setScopeBusy(true)
    setError('')
    setSuccess('')
    try {
      const r = await copyFaqsFromSite(token, scope)
      if (r.success) { setSuccess(r.message || 'Copied.'); await load() }
      else setError(r.message || 'Could not copy.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setScopeBusy(false)
    }
  }

  const resetToSite = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token || !scope) return
    if (!confirm(`Delete ${currentHotel?.name || 'this hotel'}'s own questions?\n\nIts FAQ page will show the site-wide list again. This cannot be undone.`)) return
    setScopeBusy(true)
    setError('')
    setSuccess('')
    try {
      const r = await resetFaqsToSite(token, scope)
      if (r.success) { setSuccess(r.message || 'Done.'); await load() }
      else setError(r.message || 'Could not reset.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setScopeBusy(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, sortOrder: faqs.length + 1 })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const openEdit = (faq: Faq) => {
    const f: FormState = { id: faq.id, question: faq.question, answer: faq.answer, category: faq.category || '', sortOrder: faq.sortOrder, isActive: faq.isActive }
    setEditing(f)
    setForm(f)
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return

    // The answer used to be a textarea with `required` on it, which the browser
    // enforced. The editor is not a form field, so the check belongs here.
    if (!plainText(form.answer)) {
      setError('The answer cannot be empty.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload: FaqPayload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category?.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      }
      const result = editing?.id
        ? await updateAdminFaq(token, editing.id, payload)
        : await createAdminFaq(token, payload, scope)

      if (result.success) {
        setSuccess(editing?.id ? 'FAQ updated.' : 'FAQ created.')
        setShowModal(false)
        await load()
      } else {
        setError(result.message || 'Failed to save FAQ.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, question: string) => {
    if (!confirm(`Delete this FAQ?\n\n"${question.slice(0, 80)}"`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setDeletingId(id)
    try {
      const result = await deleteAdminFaq(token, id)
      if (result.success) {
        setFaqs(prev => prev.filter(f => f.id !== id))
        setSuccess('FAQ deleted.')
      } else {
        setError(result.message || 'Failed to delete FAQ.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const categories = Array.from(new Set(faqs.map(f => f.category).filter(Boolean))) as string[]
  const filtered = filterCategory === 'all' ? faqs : faqs.filter(f => f.category === filterCategory)

  const saveCta = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setCtaSaving(true)
    setError('')
    setSuccess('')
    try {
      const result = await saveFaqCta(token, cta, scope)
      if (result.success) {
        if (result.cta) setCta({ ...DEFAULT_CTA, ...result.cta })
        setCtaDirty(false)
        setSuccess('Saved.')
      } else {
        setError(result.message || 'Could not save.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setCtaSaving(false)
    }
  }

  const editCta = (patch: Partial<FaqCta>) => {
    setCta((prev) => ({ ...prev, ...patch }))
    setCtaDirty(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Questions shown on the website. Read at{' '}
            <code className="font-mono text-xs text-gray-600">{publicPath}</code>.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New FAQ
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Whose questions. The site used to have one list, shared by every
          page; a hotel can have its own now, and falls back to the site-wide
          list when it has none. */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="shrink-0 text-sm font-medium text-gray-700" htmlFor="faqScope">
            Questions for
          </label>
          <select
            id="faqScope"
            value={scope}
            onChange={e => {
              if (ctaDirty && !confirm('You have unsaved changes to the block below. Switch anyway?')) return
              setScope(e.target.value); setError(''); setSuccess('')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-72"
          >
            <option value="">The whole site (/faqs)</option>
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          {scope ? (
            inherited || faqs.length === 0 ? (
              <p className="text-xs text-amber-700">
                This hotel has no questions of its own, so its FAQ page shows the site-wide list.
                Add one here, or copy the site-wide questions to start from.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Shown on this hotel&apos;s own FAQ page, in place of the site-wide list.
              </p>
            )
          ) : (
            <p className="text-xs text-gray-400">
              Used on /faqs and on every hotel that has not set its own.
            </p>
          )}
        </div>

        {scope && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            <button
              onClick={copyFromSite}
              disabled={scopeBusy || faqs.length > 0}
              title={faqs.length > 0 ? 'This hotel already has its own questions.' : undefined}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <DocumentDuplicateIcon className="h-3.5 w-3.5" />
              Copy the site-wide questions
            </button>
            <button
              onClick={resetToSite}
              disabled={scopeBusy || faqs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Go back to the site-wide list
            </button>
          </div>
        )}
      </div>

      {/* The block under the questions on the site. */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">&ldquo;Still have questions?&rdquo; Block</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Shown under the questions at the foot of{' '}
              <code className="font-mono">{publicPath}</code>.
              {scope && ' A hotel that has not set its own block uses the site-wide one.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={cta.enabled}
                onChange={(e) => editCta({ enabled: e.target.checked })}
                className="accent-primary-600"
              />
              Show on the site
            </label>
            <button
              onClick={saveCta}
              disabled={ctaSaving || !ctaDirty}
              className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {ctaSaving ? 'Saving…' : 'Save Block'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Heading</label>
            <input className={ctaInput} value={cta.title} onChange={(e) => editCta({ title: e.target.value })}
              placeholder="Still have questions?" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Text</label>
            <textarea rows={2} className={ctaInput + ' resize-none'} value={cta.text}
              onChange={(e) => editCta({ text: e.target.value })}
              placeholder="Our team is available 24/7 to help you with anything you need." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Button Text</label>
            <input className={ctaInput} value={cta.buttonLabel} onChange={(e) => editCta({ buttonLabel: e.target.value })}
              placeholder="Contact Us" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Button Link</label>
            <input className={ctaInput} value={cta.buttonHref} onChange={(e) => editCta({ buttonHref: e.target.value })}
              placeholder="/contact" />
            <p className="mt-1 text-xs text-gray-400">
              A path on the site, such as <code className="font-mono">/contact</code>, or a full web address.
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">Filter by category:</span>
        {['all', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* FAQ list */}
      {loading ? (
        <div className="rounded-xl bg-white shadow px-6 py-10 text-center text-sm text-gray-500">Loading FAQs…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white shadow px-6 py-16 text-center text-sm text-gray-400">
          {scope ? (
            <>
              {currentHotel?.name || 'This hotel'} has no questions of its own. Its FAQ page shows
              the site-wide list until you add one here.
            </>
          ) : (
            <>No FAQs yet. Click <strong>New FAQ</strong> to create one.</>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">
                  <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map(faq => (
                <tr key={faq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-center text-xs text-gray-400 font-mono">{faq.sortOrder}</td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{faq.question}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{plainText(faq.answer)}</p>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {faq.category ? (
                      <span className="inline-block rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs px-2.5 py-0.5 font-medium">{faq.category}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    {faq.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        <CheckCircleIcon className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                        <XCircleIcon className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(faq)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id, faq.question)}
                        disabled={deletingId === faq.id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        {deletingId === faq.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">{editing?.id ? 'Edit FAQ' : 'New FAQ'}</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  {scope ? `For ${currentHotel?.name || 'this hotel'} only` : 'For the whole site'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                <input
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. What time is check-in?"
                  value={form.question}
                  onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                <RichTextEditor
                  value={form.answer}
                  onChange={html => setForm(p => ({ ...p, answer: html }))}
                  placeholder="Provide a clear, helpful answer. Select text to make it bigger, bold, or a link."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-gray-400">(optional)</span></label>
                  <input
                    list="faq-categories"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Reservations"
                    value={form.category || ''}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  />
                  <datalist id="faq-categories">
                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.sortOrder ?? 0}
                    onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="faqActive"
                  checked={form.isActive ?? true}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                />
                <label htmlFor="faqActive" className="text-sm text-gray-700">Active (visible on the website)</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : editing?.id ? 'Update FAQ' : 'Create FAQ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
