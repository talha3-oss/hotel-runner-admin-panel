'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  fetchAdminPages,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  LandingPageMeta,
} from '../../../lib/api'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

export default function PagesPage() {
  const router = useRouter()
  const [pages, setPages] = useState<LandingPageMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [editSaving, setEditSaving] = useState(false)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    try {
      const result = await fetchAdminPages(token)
      if (result.success) setPages(result.pages || [])
      else setError(result.message || 'Failed to load pages.')
    } catch { setError('Unable to connect.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-slugify name
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newSlug.trim()) { setCreateError('Name and URL are required.'); return }
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setCreating(true)
    setCreateError('')
    try {
      const result = await createLandingPage(token, { name: newName.trim(), slug: newSlug.trim() })
      if (result.success) {
        setPages((prev) => [result.page, ...prev])
        setShowCreate(false)
        setNewName('')
        setNewSlug('')
      } else {
        setCreateError(result.message || 'Failed to create page.')
      }
    } catch { setCreateError('Unable to connect.') }
    finally { setCreating(false) }
  }

  const startEdit = (page: LandingPageMeta) => {
    setEditingId(page.id)
    setEditName(page.name)
    setEditSlug(page.slug)
    setEditStatus(page.status)
  }

  const saveEdit = async (id: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setEditSaving(true)
    try {
      const result = await updateLandingPage(token, id, { name: editName.trim(), slug: editSlug.trim(), status: editStatus })
      if (result.success) {
        setPages((prev) => prev.map((p) => p.id === id ? { ...p, name: editName.trim(), slug: result.page.slug, status: editStatus as 'ACTIVE' | 'INACTIVE' } : p))
        setEditingId(null)
      } else {
        alert(result.message || 'Failed to save.')
      }
    } catch { alert('Unable to connect.') }
    finally { setEditSaving(false) }
  }

  const handleDelete = async (page: LandingPageMeta) => {
    if (!window.confirm(`Delete "${page.name}"? This cannot be undone.`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    try {
      const result = await deleteLandingPage(token, page.id)
      if (result.success) setPages((prev) => prev.filter((p) => p.id !== page.id))
      else alert(result.message || 'Failed to delete.')
    } catch { alert('Unable to connect.') }
  }

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return iso }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="mt-1 text-sm text-gray-600">Duplicate the homepage and publish it at a custom URL</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
          Duplicate Homepage
        </button>
      </div>

      {error && <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Pages table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading pages…</div>
        ) : pages.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentDuplicateIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">No pages yet</p>
            <p className="text-xs text-gray-300 mt-1">Click "Duplicate Homepage" to create your first landing page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editingId === page.id ? (
                        <input
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{page.name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === page.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">/</span>
                          <input
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={editSlug}
                            onChange={(e) => setEditSlug(slugify(e.target.value))}
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-primary-700">/{page.slug}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === page.id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${page.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {page.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">{fmtDate(page.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === page.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(page.id)}
                              disabled={editSaving}
                              className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
                            >
                              {editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href={`${FRONTEND_URL}/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-500 transition-colors"
                              title="Preview"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => router.push(`/dashboard/pages/${page.id}`)}
                              className="text-gray-400 hover:text-primary-600 transition-colors"
                              title="Edit content"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => startEdit(page)}
                              className="text-gray-400 hover:text-orange-500 transition-colors"
                              title="Rename / change URL"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(page)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Duplicate Homepage</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">This will copy all current homepage sections into a new page that you can edit independently.</p>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Summer Offers"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    if (!newSlug || newSlug === slugify(newName)) setNewSlug(slugify(e.target.value))
                  }}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400 font-mono">yourdomain.com/</span>
                  <input
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="summer-offers"
                    value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating…' : 'Create Page'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors"
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
