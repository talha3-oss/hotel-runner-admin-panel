'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { fetchHotels, updateHotel, Hotel, getApiAssetUrl } from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface Extra {
  id: string
  name: string
  description: string
  price: number
  priceType: 'per booking' | 'per adult per morning'
  image: string
}

type ExtraFormData = {
  name: string
  description: string
  price: string
  priceType: 'per booking' | 'per adult per morning'
  image: string
}

const EMPTY_FORM: ExtraFormData = {
  name: '',
  description: '',
  price: '',
  priceType: 'per booking',
  image: '',
}

const toExtras = (raw: unknown): Extra[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const name = typeof r.name === 'string' ? r.name.trim() : ''
      if (!name) return null
      return {
        id: typeof r.id === 'string' && r.id ? r.id : `extra-${i + 1}`,
        name,
        description: typeof r.description === 'string' ? r.description : '',
        price: Number.isFinite(Number(r.price)) ? Math.max(0, Number(r.price)) : 0,
        priceType: r.priceType === 'per adult per morning' ? 'per adult per morning' : 'per booking',
        image: typeof r.image === 'string' ? r.image : '',
      } as Extra
    })
    .filter((e): e is Extra => e !== null)
}

export default function ExtrasPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [extras, setExtras] = useState<Extra[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null)
  const [formData, setFormData] = useState<ExtraFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadHotels = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    try {
      const result = await fetchHotels(token)
      if (result.success && Array.isArray(result.hotels)) {
        setHotels(result.hotels)
        if (result.hotels.length > 0 && !selectedHotelId) {
          setSelectedHotelId(result.hotels[0].id)
        }
      } else {
        setError(result.message || 'Failed to load hotels.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [selectedHotelId])

  useEffect(() => { loadHotels() }, [])

  useEffect(() => {
    if (!selectedHotelId) { setExtras([]); return }
    const hotel = hotels.find((h) => h.id === selectedHotelId)
    setExtras(hotel ? toExtras(hotel.bookingExtras) : [])
  }, [selectedHotelId, hotels])

  const saveExtras = async (nextExtras: Extra[]) => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); return }
    setSaving(true)
    setError('')
    try {
      const result = await updateHotel(token, selectedHotelId, { bookingExtras: nextExtras })
      if (result.success) {
        setHotels((prev) =>
          prev.map((h) => (h.id === selectedHotelId ? { ...h, bookingExtras: nextExtras } : h))
        )
      } else {
        setError(result.message || 'Failed to save extras.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const openAddModal = () => {
    setEditingExtra(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (extra: Extra) => {
    setEditingExtra(extra)
    setFormData({
      name: extra.name,
      description: extra.description,
      price: String(extra.price),
      priceType: extra.priceType,
      image: extra.image,
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingExtra(null)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  const handleImageUpload = async (file: File) => {
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`${API_BASE_URL}/upload-image-multer`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.data?.fileUrl) {
        setFormData((prev) => ({ ...prev, image: data.data.fileUrl }))
      } else {
        setFormError('Image upload failed.')
      }
    } catch {
      setFormError('Image upload failed.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = formData.name.trim()
    if (!name) { setFormError('Name is required.'); return }
    const price = Number(formData.price)
    if (!Number.isFinite(price) || price < 0) { setFormError('Price must be a non-negative number.'); return }

    const extra: Extra = {
      id: editingExtra?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: formData.description.trim(),
      price,
      priceType: formData.priceType,
      image: formData.image.trim(),
    }

    const nextExtras = editingExtra
      ? extras.map((e) => (e.id === editingExtra.id ? extra : e))
      : [...extras, extra]

    await saveExtras(nextExtras)
    closeModal()
  }

  const handleDelete = async (extra: Extra) => {
    const confirmed = window.confirm(`Delete extra "${extra.name}"? This cannot be undone.`)
    if (!confirmed) return
    await saveExtras(extras.filter((e) => e.id !== extra.id))
  }

  const selectedHotel = hotels.find((h) => h.id === selectedHotelId)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extras</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage optional add-ons shown during booking (e.g. breakfast, parking, spa)
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={!selectedHotelId || saving}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
          Add Extra
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Hotel selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Hotel</label>
        {loading ? (
          <p className="text-sm text-gray-500">Loading hotels...</p>
        ) : (
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name} — {h.location}</option>
            ))}
          </select>
        )}
      </div>

      {selectedHotel && (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {extras.map((extra) => (
                <tr key={extra.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {extra.image ? (
                      <img
                        src={getApiAssetUrl(extra.image)}
                        alt={extra.name}
                        className="h-12 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 items-center justify-center rounded bg-gray-100">
                        <PhotoIcon className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{extra.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{extra.description || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">€{extra.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {extra.priceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEditModal(extra)} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(extra)} className="text-red-600 hover:text-red-800" title="Delete">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {extras.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    No extras yet for this hotel. Add your first one above.
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
          <div className="relative mx-auto mt-16 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {editingExtra ? 'Edit Extra' : 'Add Extra'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
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
                  placeholder="e.g. Breakfast, Parking, Spa Access"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Short description shown to guests"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                  <select
                    value={formData.priceType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priceType: e.target.value as ExtraFormData['priceType'] }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="per booking">Per booking</option>
                    <option value="per adult per morning">Per adult per morning</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <div className="flex items-center gap-3">
                  {formData.image ? (
                    <img src={getApiAssetUrl(formData.image)} alt="preview" className="h-16 w-20 rounded object-cover border border-gray-200" />
                  ) : (
                    <div className="flex h-16 w-20 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50">
                      <PhotoIcon className="h-7 w-7 text-gray-300" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {imageUploading ? 'Uploading...' : 'Upload Image'}
                    </button>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                    e.target.value = ''
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingExtra ? 'Save Changes' : 'Add Extra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
