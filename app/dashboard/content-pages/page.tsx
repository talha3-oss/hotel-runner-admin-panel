'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  PhotoIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { fetchAdminPageById, fetchAdminPages, updateLandingPage, uploadHomepageSectionImage } from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = 'hero' | 'text' | 'cards' | 'offers' | 'cta' | 'contact-info' | 'form' | 'sitemap'

interface Section {
  type: SectionType
  title?: string
  subtitle?: string
  content?: string
  image?: string
  buttonLabel?: string
  buttonHref?: string
  contactNote?: string
  formType?: string
  items?: unknown[]
  columns?: unknown[]
  options?: string[]
}

interface ContentPage {
  id: string
  name: string
  slug: string
  status: string
  sections: Section[]
  updatedAt: string
}

// Fixed pages that are linked from footer/navbar
const CONTENT_PAGES = [
  { slug: 'contact', name: 'Contact Us', icon: '📞' },
  { slug: 'special-offers', name: 'Special Offers', icon: '🏷️' },
  { slug: 'gift-cards', name: 'Gift Cards', icon: '🎁' },
  { slug: 'sitemap', name: 'Sitemap', icon: '🗺️' },
  { slug: 'corporate-rates', name: 'Corporate Rates', icon: '💼' },
]

const SECTION_TYPES: { value: SectionType; label: string; desc: string }[] = [
  { value: 'hero', label: 'Hero Banner', desc: 'Large heading with background image' },
  { value: 'text', label: 'Text Block', desc: 'Title and rich text content' },
  { value: 'cards', label: 'Cards Grid', desc: 'Icon + title + text cards' },
  { value: 'offers', label: 'Offers', desc: 'Offer cards with image and highlights' },
  { value: 'cta', label: 'Call to Action', desc: 'Title, subtitle and button' },
  { value: 'contact-info', label: 'Contact Info', desc: 'List of contact details' },
  { value: 'form', label: 'Contact Form', desc: 'Embedded contact form' },
  { value: 'sitemap', label: 'Sitemap Columns', desc: 'Link columns for sitemap' },
]

// ─── Section Form ─────────────────────────────────────────────────────────────

function SectionModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Section> | null
  onSave: (s: Section) => void
  onClose: () => void
}) {
  const isNew = !initial?.type
  const [type, setType] = useState<SectionType>(initial?.type || 'text')
  const [title, setTitle] = useState(initial?.title || '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '')
  const [content, setContent] = useState(initial?.content || '')
  const [image, setImage] = useState(initial?.image || '')
  const [buttonLabel, setButtonLabel] = useState(initial?.buttonLabel || '')
  const [buttonHref, setButtonHref] = useState(initial?.buttonHref || '')
  const [contactNote, setContactNote] = useState(initial?.contactNote || '')
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  // items editor (for cards, offers, contact-info)
  const [itemsRaw, setItemsRaw] = useState(
    initial?.items ? JSON.stringify(initial.items, null, 2) : '[]'
  )
  const [columnsRaw, setColumnsRaw] = useState(
    initial?.columns ? JSON.stringify(initial.columns, null, 2) : '[]'
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadHomepageSectionImage(file)
      if (result.success && result.data?.fileUrl) setImage(result.data.fileUrl)
    } finally {
      setUploading(false)
      if (imgRef.current) imgRef.current.value = ''
    }
  }

  const handleSave = () => {
    let items: unknown[] = []
    let columns: unknown[] = []
    try { items = JSON.parse(itemsRaw) } catch { items = [] }
    try { columns = JSON.parse(columnsRaw) } catch { columns = [] }

    const section: Section = { type, title, subtitle, content, image, buttonLabel, buttonHref, contactNote }
    if (['cards', 'offers', 'contact-info'].includes(type)) section.items = items
    if (type === 'sitemap') section.columns = columns
    onSave(section)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{isNew ? 'Add Section' : 'Edit Section'}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector (only for new) */}
          {isNew && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section Type</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_TYPES.map(st => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setType(st.value)}
                    className={`text-left p-3 rounded-lg border text-sm transition-colors ${type === st.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="font-medium text-gray-900">{st.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Common fields */}
          {type !== 'form' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}

          {['hero', 'text', 'cta', 'offers'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}

          {/* Image */}
          {['hero', 'cta'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background / Image</label>
              <div className="flex items-center gap-4">
                {image ? (
                  <img src={image.startsWith('http') ? image : `${API_BASE_URL}${image}`} alt="" className="h-20 w-32 rounded object-cover border" />
                ) : (
                  <div className="h-20 w-32 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <PhotoIcon className="h-6 w-6 text-gray-300" />
                  </div>
                )}
                <div className="space-y-2">
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  {image && <button type="button" onClick={() => setImage('')}
                    className="block px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">Remove</button>}
                </div>
                <input ref={imgRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
            </div>
          )}

          {/* Text content */}
          {['text', 'form'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'form' ? 'Form Description' : 'Content'} <span className="text-gray-400 font-normal">(supports **bold**, *italic*, ## heading, - list)</span>
              </label>
              <textarea rows={6} value={content} onChange={e => setContent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}

          {/* Button */}
          {['cta', 'hero'].includes(type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                <input value={buttonLabel} onChange={e => setButtonLabel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                <input value={buttonHref} onChange={e => setButtonHref(e.target.value)}
                  placeholder="/contact"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Contact note */}
          {type === 'cta' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Note (below button)</label>
              <input value={contactNote} onChange={e => setContactNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}

          {/* Items JSON editor for cards/offers/contact-info */}
          {['cards', 'offers', 'contact-info'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items <span className="text-gray-400 font-normal text-xs">(JSON array)</span>
              </label>
              <div className="mb-2 text-xs text-gray-400 bg-gray-50 rounded p-2 font-mono">
                {type === 'cards' && `[{"icon":"star","title":"...","text":"..."}]`}
                {type === 'offers' && `[{"title":"...","badge":"...","description":"...","highlight":"...","image":"...","includes":["..."]}]`}
                {type === 'contact-info' && `[{"icon":"phone","label":"...","value":"..."}]`}
              </div>
              <textarea rows={8} value={itemsRaw} onChange={e => setItemsRaw(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}

          {/* Sitemap columns */}
          {type === 'sitemap' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Columns <span className="text-gray-400 font-normal text-xs">(JSON)</span>
              </label>
              <div className="mb-2 text-xs text-gray-400 bg-gray-50 rounded p-2 font-mono">
                {`[{"title":"Section","links":[{"label":"Page","href":"/page"}]}]`}
              </div>
              <textarea rows={8} value={columnsRaw} onChange={e => setColumnsRaw(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            {isNew ? 'Add Section' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPagesAdmin() {
  const [activePage, setActivePage] = useState<ContentPage | null>(null)
  const [allPages, setAllPages] = useState<ContentPage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const loadPages = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await fetchAdminPages(token)
      if (result.success) {
        const mapped = (result.pages || []).filter((p: { slug: string }) =>
          CONTENT_PAGES.some(cp => cp.slug === p.slug)
        )
        setAllPages(mapped)
        if (!activePage && mapped.length > 0) {
          await loadPageSections(mapped[0].id, token)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [activePage])

  const loadPageSections = async (id: string, token: string) => {
    const result = await fetchAdminPageById(token, id)
    if (result.success) {
      setActivePage({ ...result.page, sections: result.page.sections || [] })
    }
  }

  useEffect(() => { loadPages() }, [])

  const selectPage = async (id: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    await loadPageSections(id, token)
    setLoading(false)
  }

  const savePages = async () => {
    if (!activePage) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const result = await updateLandingPage(token, activePage.id, { sections: activePage.sections })
      if (result.success) {
        setSuccess('Page saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.message || 'Save failed.')
      }
    } catch {
      setError('Unable to connect.')
    } finally {
      setSaving(false)
    }
  }

  const updateSections = (sections: Section[]) => {
    if (!activePage) return
    setActivePage({ ...activePage, sections })
  }

  const moveSection = (index: number, dir: -1 | 1) => {
    if (!activePage) return
    const sections = [...activePage.sections]
    const target = index + dir
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]]
    updateSections(sections)
  }

  const deleteSection = (index: number) => {
    if (!activePage) return
    if (!confirm('Remove this section?')) return
    updateSections(activePage.sections.filter((_, i) => i !== index))
  }

  const openAdd = () => { setEditingIndex(null); setShowSectionModal(true) }
  const openEdit = (i: number) => { setEditingIndex(i); setShowSectionModal(true) }

  const handleSectionSave = (section: Section) => {
    if (!activePage) return
    const sections = [...activePage.sections]
    if (editingIndex !== null) {
      sections[editingIndex] = section
    } else {
      sections.push(section)
    }
    updateSections(sections)
    setShowSectionModal(false)
  }

  const sectionLabel = (s: Section) => SECTION_TYPES.find(t => t.value === s.type)?.label || s.type

  const getPageMeta = (slug: string) => CONTENT_PAGES.find(p => p.slug === slug)

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Left: page list */}
      <div className="w-56 flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Content Pages</h2>
        {loading && !activePage ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : (
          <nav className="space-y-1">
            {CONTENT_PAGES.map(cp => {
              const dbPage = allPages.find(p => p.slug === cp.slug)
              const isActive = activePage?.slug === cp.slug
              return (
                <button
                  key={cp.slug}
                  onClick={() => dbPage && selectPage(dbPage.id)}
                  disabled={!dbPage}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  } ${!dbPage ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span>{cp.icon}</span>
                  <span>{cp.name}</span>
                </button>
              )
            })}
          </nav>
        )}
      </div>

      {/* Right: section editor */}
      <div className="flex-1 min-w-0">
        {!activePage ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Select a page to edit</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getPageMeta(activePage.slug)?.icon}</span>
                  <h1 className="text-xl font-bold text-gray-900">{activePage.name}</h1>
                  <span className="text-sm font-mono text-gray-400">/{activePage.slug}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{activePage.sections.length} section{activePage.sections.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                {success && <span className="text-sm text-green-600 font-medium">{success}</span>}
                {error && <span className="text-sm text-red-600">{error}</span>}
                <button onClick={openAdd}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <PlusIcon className="h-4 w-4" /> Add Section
                </button>
                <button onClick={savePages} disabled={saving}
                  className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
                  {saving ? 'Saving…' : 'Save Page'}
                </button>
              </div>
            </div>

            {activePage.sections.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
                <p className="text-gray-400 mb-4">No sections yet. Add your first section.</p>
                <button onClick={openAdd}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  <PlusIcon className="h-4 w-4 inline mr-1" /> Add Section
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activePage.sections.map((section, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                    {/* Order controls */}
                    <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                      <button onClick={() => moveSection(i, -1)} disabled={i === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                        <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      <span className="text-xs text-center text-gray-300 font-mono">{i + 1}</span>
                      <button onClick={() => moveSection(i, 1)} disabled={i === activePage.sections.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                        <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>

                    {/* Section preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                          {sectionLabel(section)}
                        </span>
                        {section.title && (
                          <span className="text-sm font-medium text-gray-900 truncate">{section.title}</span>
                        )}
                      </div>
                      {section.subtitle && (
                        <p className="text-xs text-gray-400 truncate">{section.subtitle}</p>
                      )}
                      {section.content && (
                        <p className="text-xs text-gray-400 truncate">{section.content.slice(0, 100)}</p>
                      )}
                      {Array.isArray(section.items) && (
                        <p className="text-xs text-gray-400">{section.items.length} item{section.items.length !== 1 ? 's' : ''}</p>
                      )}
                      {section.image && (
                        <p className="text-xs text-gray-300 truncate">📷 {section.image}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(i)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteSection(i)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Section modal */}
      {showSectionModal && (
        <SectionModal
          initial={editingIndex !== null ? activePage?.sections[editingIndex] || null : null}
          onSave={handleSectionSave}
          onClose={() => setShowSectionModal(false)}
        />
      )}
    </div>
  )
}
