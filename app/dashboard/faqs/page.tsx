'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { Faq, FaqPayload, createAdminFaq, deleteAdminFaq, fetchAdminFaqs, updateAdminFaq } from '../../../lib/api'

type FormState = FaqPayload & { id: string }

const EMPTY: FormState = { id: '', question: '', answer: '', category: '', sortOrder: 0, isActive: true }

const CATEGORIES = ['Reservations', 'Dining', 'Services', 'Facilities', 'Policies', 'Accessibility', 'General']

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

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await fetchAdminFaqs(token)
      if (result.success) setFaqs(result.faqs || [])
      else setError(result.message || 'Failed to load FAQs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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
        : await createAdminFaq(token, payload)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="mt-1 text-sm text-gray-500">Manage frequently asked questions shown on the website.</p>
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
          No FAQs yet. Click <strong>New FAQ</strong> to create one.
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
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{faq.answer}</p>
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
              <h2 className="text-base font-bold text-gray-900">{editing?.id ? 'Edit FAQ' : 'New FAQ'}</h2>
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
                <textarea
                  required
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Provide a clear, helpful answer…"
                  value={form.answer}
                  onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
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
