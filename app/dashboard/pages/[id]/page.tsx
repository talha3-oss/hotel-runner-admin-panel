'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, EyeIcon } from '@heroicons/react/24/outline'
import {
  fetchAdminPageById,
  updateLandingPage,
  LandingPageMeta,
  PageSection,
} from '../../../../lib/api'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

type EditableSection = PageSection & { _dirty?: boolean }

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [pageMeta, setPageMeta] = useState<LandingPageMeta | null>(null)
  const [sections, setSections] = useState<EditableSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    try {
      const result = await fetchAdminPageById(token, id)
      if (result.success) {
        setPageMeta({
          id: result.page.id,
          name: result.page.name,
          slug: result.page.slug,
          status: result.page.status,
          createdAt: result.page.createdAt,
          updatedAt: result.page.updatedAt,
        })
        setSections((result.page.sections as PageSection[]) || [])
      } else {
        setError(result.message || 'Failed to load page.')
      }
    } catch { setError('Unable to connect.') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const updateSection = (idx: number, field: keyof PageSection, value: string) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value, _dirty: true } : s))
  }

  const toggleStatus = (idx: number) => {
    setSections((prev) => prev.map((s, i) =>
      i === idx ? { ...s, status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', _dirty: true } : s
    ))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const cleaned = sections.map(({ _dirty, ...s }) => s)
      const result = await updateLandingPage(token, id, { sections: cleaned })
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        alert(result.message || 'Failed to save.')
      }
    } catch { alert('Unable to connect.') }
    finally { setSaving(false) }
  }

  const sectionLabel = (s: EditableSection) =>
    s.name || s.sectionKey || s.sectionType

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading page…</div>
  }

  if (error) {
    return <div className="p-8 text-center text-sm text-red-600">{error}</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/pages')}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pageMeta?.name}</h1>
            <p className="mt-0.5 text-sm text-gray-500 font-mono">/{pageMeta?.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`${FRONTEND_URL}/${pageMeta?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 border border-gray-300 hover:border-blue-400 px-3 py-2 rounded-lg transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
            Preview
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-6 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          Changes saved successfully.
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-12">No sections found on this page.</div>
        )}
        {sections.map((section, idx) => (
          <div
            key={section.sectionKey || idx}
            className={`bg-white rounded-lg shadow border ${section.status === 'INACTIVE' ? 'border-gray-200 opacity-60' : 'border-gray-100'}`}
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                  {section.sectionType}
                </span>
                <span className="text-sm font-semibold text-gray-800">{sectionLabel(section)}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-gray-500">{section.status === 'ACTIVE' ? 'Visible' : 'Hidden'}</span>
                <div
                  onClick={() => toggleStatus(idx)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    section.status === 'ACTIVE' ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      section.status === 'ACTIVE' ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Fields */}
            <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.title !== null && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.title || ''}
                    onChange={(e) => updateSection(idx, 'title', e.target.value)}
                  />
                </div>
              )}
              {section.subtitle !== null && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.subtitle || ''}
                    onChange={(e) => updateSection(idx, 'subtitle', e.target.value)}
                  />
                </div>
              )}
              {section.eyebrow !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Eyebrow</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.eyebrow || ''}
                    onChange={(e) => updateSection(idx, 'eyebrow', e.target.value)}
                  />
                </div>
              )}
              {section.badge !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Badge</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.badge || ''}
                    onChange={(e) => updateSection(idx, 'badge', e.target.value)}
                  />
                </div>
              )}
              {section.description !== null && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                    value={section.description || ''}
                    onChange={(e) => updateSection(idx, 'description', e.target.value)}
                  />
                </div>
              )}
              {section.buttonLabel !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Button Label</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.buttonLabel || ''}
                    onChange={(e) => updateSection(idx, 'buttonLabel', e.target.value)}
                  />
                </div>
              )}
              {section.buttonLink !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Button Link</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.buttonLink || ''}
                    onChange={(e) => updateSection(idx, 'buttonLink', e.target.value)}
                  />
                </div>
              )}
              {section.secondaryButtonLabel !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Secondary Button Label</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.secondaryButtonLabel || ''}
                    onChange={(e) => updateSection(idx, 'secondaryButtonLabel', e.target.value)}
                  />
                </div>
              )}
              {section.secondaryButtonLink !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Secondary Button Link</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={section.secondaryButtonLink || ''}
                    onChange={(e) => updateSection(idx, 'secondaryButtonLink', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {sections.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
