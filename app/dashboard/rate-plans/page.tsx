'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  fetchAdminRoomTypes,
  createAdminRoomType,
  updateAdminRoomType,
  deleteAdminRoomType,
  RoomTypeOption,
} from '../../../lib/api'

// The 6 canonical rate plan keys — shown with a "Built-in" badge
const BUILTIN_KEYS = new Set([
  'pay-now-room-only',
  'flexible-rate-room-only',
  'pay-now-bed-breakfast',
  'flexible-rate-bed-breakfast',
  'pay-now-half-board',
  'flexible-rate-half-board',
])

type FormData = { name: string; description: string }
const EMPTY_FORM: FormData = { name: '', description: '' }

export default function RatePlansPage() {
  const [plans, setPlans] = useState<RoomTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<RoomTypeOption | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const loadPlans = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }

    try {
      setError('')
      const result = await fetchAdminRoomTypes(token)
      if (result.success) {
        setPlans(result.roomTypes || [])
      } else {
        setError(result.message || 'Failed to load rate plans.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  const openAddModal = () => {
    setEditingPlan(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (plan: RoomTypeOption) => {
    setEditingPlan(plan)
    setFormData({ name: plan.name, description: plan.description || '' })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) { setFormError('Admin token not found.'); return }

    const name = formData.name.trim()
    if (!name) { setFormError('Name is required.'); return }

    setFormLoading(true)
    setFormError('')

    try {
      const payload = { name, description: formData.description.trim() || undefined }
      const result = editingPlan
        ? await updateAdminRoomType(token, editingPlan.id, payload)
        : await createAdminRoomType(token, payload)

      if (result.success) {
        closeModal()
        await loadPlans()
      } else {
        setFormError(result.message || 'Something went wrong.')
      }
    } catch {
      setFormError('Unable to connect to server.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (plan: RoomTypeOption) => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); return }

    const confirmed = window.confirm(`Delete rate plan "${plan.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      const result = await deleteAdminRoomType(token, plan.id)
      if (result.success) {
        await loadPlans()
      } else {
        setError(result.message || 'Failed to delete rate plan.')
      }
    } catch {
      setError('Unable to connect to server.')
    }
  }

  // Auto-preview the key that the backend will generate
  const previewKey = formData.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const isBuiltin = (plan: RoomTypeOption) =>
    plan.key ? BUILTIN_KEYS.has(plan.key) : false

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Plans</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage rate plan types used across all hotel rooms
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          Add Rate Plan
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-md bg-white p-6 text-sm text-gray-600 shadow">Loading rate plans...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Key / Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {plans.map((plan) => {
                const builtin = isBuiltin(plan)
                return (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{plan.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {plan.key || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {plan.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {builtin ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          Built-in
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditModal(plan)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          disabled={builtin}
                          className={builtin ? 'cursor-not-allowed text-gray-300' : 'text-red-600 hover:text-red-800'}
                          title={builtin ? 'Built-in plans cannot be deleted' : 'Delete'}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    No rate plans found. Add your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative mx-auto mt-24 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {editingPlan ? 'Edit Rate Plan' : 'Add Rate Plan'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Pay Now - All Inclusive"
                />
              </div>

              {previewKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Auto-generated key</label>
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {previewKey}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description for this rate plan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={formLoading}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading ? 'Saving...' : editingPlan ? 'Save Changes' : 'Add Rate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
