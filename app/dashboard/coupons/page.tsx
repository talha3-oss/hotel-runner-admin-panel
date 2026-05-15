'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import {
  Coupon,
  CouponPayload,
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
} from '../../../lib/api'

type FormState = CouponPayload & { id: string; maxUses: number | null }

const EMPTY_FORM: FormState = {
  id: '',
  code: '',
  discount: 0,
  description: '',
  isActive: true,
  maxUses: null,
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await fetchAdminCoupons(token)
      if (result.success) setCoupons(result.coupons || [])
      else setError(result.message || 'Failed to load coupons.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const openEdit = (coupon: Coupon) => {
    const f: FormState = {
      id: coupon.id,
      code: coupon.code,
      discount: coupon.discount,
      description: coupon.description || '',
      isActive: coupon.isActive,
      maxUses: coupon.maxUses ?? null,
    }
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
      const payload: CouponPayload = {
        code: form.code.trim().toUpperCase(),
        discount: Number(form.discount),
        description: form.description?.trim() || undefined,
        isActive: form.isActive,
        maxUses: form.maxUses != null && form.maxUses > 0 ? Number(form.maxUses) : null,
      }
      const result = editing?.id
        ? await updateAdminCoupon(token, editing.id, payload)
        : await createAdminCoupon(token, payload)

      if (result.success) {
        setSuccess(editing?.id ? 'Coupon updated.' : 'Coupon created.')
        setShowModal(false)
        await load()
      } else {
        setError(result.message || 'Failed to save coupon.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setDeletingId(id)
    try {
      const result = await deleteAdminCoupon(token, id)
      if (result.success) {
        setCoupons(prev => prev.filter(c => c.id !== id))
        setSuccess('Coupon deleted.')
      } else {
        setError(result.message || 'Failed to delete coupon.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage discount coupon codes for guests.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow">
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">Loading coupons…</div>
        ) : coupons.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No coupons yet. Click <strong>New Coupon</strong> to create one.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {coupons.map(coupon => {
                const used = coupon.usedCount ?? 0
                const max = coupon.maxUses ?? null
                const remaining = max != null ? max - used : null
                const exhausted = max != null && used >= max

                return (
                  <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{coupon.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-primary-600">{coupon.discount}% off</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{coupon.description || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-6 py-4">
                      {max == null ? (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-700">{used}</span>
                          <span className="text-gray-400"> used · unlimited</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className={`font-semibold ${exhausted ? 'text-red-600' : 'text-gray-700'}`}>{used}</span>
                            <span className="text-gray-400"> / {max} used</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${exhausted ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${exhausted ? 'text-red-600' : 'text-green-600'}`}>
                              {exhausted ? 'Exhausted' : `${remaining} left`}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {coupon.isActive && !exhausted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : exhausted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                          <XCircleIcon className="h-3.5 w-3.5" /> Exhausted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                          <XCircleIcon className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(coupon.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <PencilIcon className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          disabled={deletingId === coupon.id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {deletingId === coupon.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">{editing?.id ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                <input
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. SUMMER20"
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage *</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
                    placeholder="e.g. 20"
                    value={form.discount || ''}
                    onChange={e => setForm(prev => ({ ...prev, discount: Number(e.target.value) }))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Uses <span className="text-gray-400">(optional — leave empty for unlimited)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. 100"
                  value={form.maxUses ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, maxUses: e.target.value ? Number(e.target.value) : null }))}
                />
                <p className="mt-1 text-xs text-gray-400">Each email address can only use this coupon once regardless of this limit.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Summer promotion 2026"
                  value={form.description || ''}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive ?? true}
                  onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active (guests can use this coupon)</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : editing?.id ? 'Update Coupon' : 'Create Coupon'}
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
