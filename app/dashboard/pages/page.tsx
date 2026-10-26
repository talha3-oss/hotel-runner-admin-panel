'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import PageEditorModal from '../homepage/PageEditorModal'
import { SITE_URL } from '../../../lib/siteUrl'
import {
  fetchAdminPages,
  createAdminContentPage,
  updateLandingPage,
  deleteLandingPage,
} from '../../../lib/api'


interface PageRow {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  updatedAt: string
}

/** The backend cleans the slug the same way on save; doing it here as well
 *  means the field shows what the URL will actually be, rather than quietly
 *  changing underneath the person typing it. */
function cleanSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Create / rename dialog ───────────────────────────────────────────────────

function PageSettingsModal({
  page,
  takenSlugs,
  onClose,
  onSaved,
}: {
  page: PageRow | null
  takenSlugs: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = page === null
  const [name, setName] = useState(page?.name || '')
  const [slug, setSlug] = useState(page?.slug || '')
  const [status, setStatus] = useState(page?.status || 'ACTIVE')
  // A new page takes its URL from the name until the URL is typed in directly,
  // at which point the two stop being tied together.
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveSlug = cleanSlug(slugTouched ? slug : name)

  const save = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!name.trim()) { setError('Give the page a name.'); return }
    if (!effectiveSlug) { setError('Give the page a web address.'); return }
    if (takenSlugs.includes(effectiveSlug)) {
      setError(`/${effectiveSlug} is already taken by another page.`)
      return
    }

    setSaving(true)
    setError('')
    try {
      const result = isNew
        ? await createAdminContentPage(token, name.trim(), effectiveSlug)
        : await updateLandingPage(token, page.id, { name: name.trim(), slug: effectiveSlug, status })
      if (result.success) onSaved()
      else setError(result.message || 'Could not save the page.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const inp =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">{isNew ? 'New Page' : 'Page Settings'}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Page Name</label>
            <input
              className={inp}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cancellation Policy"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Only shown here, to help you find the page in this list.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Web Address</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">/</span>
              <input
                className={`${inp} font-mono`}
                value={slugTouched ? slug : effectiveSlug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }}
                placeholder="cancellation-policy"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              The page will live at <span className="font-mono text-gray-700">{SITE_URL}/{effectiveSlug || '…'}</span>
            </p>
          </div>

          {!isNew && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Published — anyone can open it</option>
                <option value="INACTIVE">Hidden — the address returns Not Found</option>
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isNew ? 'Create Page' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pages table ──────────────────────────────────────────────────────────────

export default function PagesAdmin() {
  const [pages, setPages] = useState<PageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingsFor, setSettingsFor] = useState<PageRow | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [editing, setEditing] = useState<PageRow | null>(null)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const result = await fetchAdminPages(token)
      if (result.success) setPages(result.pages || [])
      else setError(result.message || 'Could not load the pages.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setSettingsFor(null); setShowSettings(true) }
  const openSettings = (p: PageRow) => { setSettingsFor(p); setShowSettings(true) }

  const remove = async (p: PageRow) => {
    if (!confirm(`Delete "${p.name}"? Everything on the page goes with it, and /${p.slug} stops working.`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    const result = await deleteLandingPage(token, p.id)
    if (result.success) load()
    else setError(result.message || 'Could not delete the page.')
  }

  // A page keeps its own slug, so it is only a clash when another row has it.
  const takenSlugs = pages
    .filter((p) => p.id !== settingsFor?.id)
    .map((p) => p.slug)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every page on the site apart from the homepage. Build one here, then add a link to it
            under Homepage Content → Navigation Menu if you want it in the site menu.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4" /> New Page
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading pages…</div>
        ) : pages.length === 0 ? (
          <div className="py-16 text-center">
            <DocumentTextIcon className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">No pages yet</p>
            <p className="mt-1 text-sm text-gray-400">Create one and it is live at its own address straight away.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Last Edited</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-500">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.status === 'ACTIVE' ? 'Published' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        title="Edit what is on the page"
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        <PencilIcon className="h-3.5 w-3.5" /> Content
                      </button>
                      <button
                        onClick={() => openSettings(p)}
                        title="Rename, change the address, publish or hide"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        <Cog6ToothIcon className="h-3.5 w-3.5" /> Settings
                      </button>
                      <a
                        href={`${SITE_URL}/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open on the site"
                        className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /> View
                      </a>
                      <button
                        onClick={() => remove(p)}
                        title="Delete this page"
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showSettings && (
        <PageSettingsModal
          page={settingsFor}
          takenSlugs={takenSlugs}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); load() }}
        />
      )}

      {editing && (
        <PageEditorModal
          slug={editing.slug}
          pageName={editing.name}
          onClose={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
