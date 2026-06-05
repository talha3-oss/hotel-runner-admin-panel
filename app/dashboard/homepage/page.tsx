'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon,
  ArrowUpIcon, ArrowDownIcon, PhotoIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline'
import {
  fetchAdminHomePageSections, createAdminHomePageSection, updateAdminHomePageSection,
  deleteAdminHomePageSection, fetchNavMenu, saveNavMenu, getApiAssetUrl,
  uploadHomepageSectionImage,
  HomePageSection, HomePageSectionType, HomePageSectionStatus,
} from '../../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem { id: string; label: string; href: string; visible: boolean; openInNewTab: boolean; order: number }
type LinkItem = { label: string; href: string }
interface CardItem { title: string; link: string; image: string; imageAlt: string; linkLabel: string; _file?: File }
interface FooterData {
  newsletterTitle: string; subscribeButtonLabel: string; consentText: string
  privacyLabel: string; privacyLink: string; leftColumnTitle: string
  leftLinks: LinkItem[]; rightColumnTitle: string; rightLinks: LinkItem[]
  copyrightText: string; partnerLogos: string[]
  partnerGroupTitle: string; partnerGroupSubtitle: string
}
interface SectionForm {
  name: string; sectionKey: string; groupKey: string
  sectionType: HomePageSectionType; status: HomePageSectionStatus; sortOrder: number
  badge: string; eyebrow: string; title: string; subtitle: string; description: string
  buttonLabel: string; buttonLink: string; secondaryButtonLabel: string; secondaryButtonLink: string
  imageAlt: string
  // type-specific content fields
  locationPlaceholder: string      // HERO
  secondaryTitle: string           // TEXT
  secondaryDescription: string     // TEXT
  cards: CardItem[]               // LOCATION
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_TYPES: HomePageSectionType[] = ['HERO','TEXT','CARD','FEATURE','CTA','LOCATION','FOOTER','NEWSLETTER','CUSTOM']
const TYPE_COLORS: Record<string, string> = {
  HERO:'bg-purple-100 text-purple-700 border-purple-200', TEXT:'bg-blue-100 text-blue-700 border-blue-200',
  CARD:'bg-green-100 text-green-700 border-green-200', FEATURE:'bg-orange-100 text-orange-700 border-orange-200',
  CTA:'bg-yellow-100 text-yellow-700 border-yellow-200', LOCATION:'bg-teal-100 text-teal-700 border-teal-200',
  FOOTER:'bg-gray-100 text-gray-700 border-gray-200', NEWSLETTER:'bg-pink-100 text-pink-700 border-pink-200',
  CUSTOM:'bg-slate-100 text-slate-700 border-slate-200',
}

const EMPTY_FORM: SectionForm = {
  name:'', sectionKey:'', groupKey:'general', sectionType:'FEATURE', status:'ACTIVE', sortOrder:0,
  badge:'', eyebrow:'', title:'', subtitle:'', description:'',
  buttonLabel:'', buttonLink:'', secondaryButtonLabel:'', secondaryButtonLink:'', imageAlt:'',
  locationPlaceholder:'', secondaryTitle:'', secondaryDescription:'', cards:[],
}

const DEFAULT_FOOTER: FooterData = {
  newsletterTitle:'Sign Up for Exclusive Offers', subscribeButtonLabel:'Subscribe',
  consentText:'By clicking subscribe, you agree to our Terms and that you have read our Privacy Policy',
  privacyLabel:'Privacy Policy', privacyLink:'/privacy-policy', leftColumnTitle:'LuxHotel',
  leftLinks:[{label:'Gift Cards',href:'/gift-cards'},{label:'Contact Us',href:'/contact'},{label:'Hotel FAQs',href:'/faqs'}],
  rightColumnTitle:'Useful Links',
  rightLinks:[{label:'Special Offers',href:'/special-offers'},{label:'Sitemap',href:'/sitemap'},{label:'Corporate Rates',href:'/corporate-rates'}],
  copyrightText:`© ${new Date().getFullYear()} Luxotel. All rights reserved.`,
  partnerLogos:[], partnerGroupTitle:'Dalata Hotel Group', partnerGroupSubtitle:'Part of the',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFooterContent(c: Record<string, unknown>): Partial<FooterData> {
  const str = (v: unknown, fb: string) => (typeof v === 'string' && v ? v : fb)
  const links = (v: unknown, fb: LinkItem[]) => {
    if (!Array.isArray(v)) return fb
    const p = v.filter(x => x && typeof x === 'object').map(x => ({ label: String((x as Record<string,unknown>).label||''), href: String((x as Record<string,unknown>).href||'') })).filter(x => x.label)
    return p.length ? p : fb
  }
  return {
    newsletterTitle: str(c.newsletterTitle, DEFAULT_FOOTER.newsletterTitle),
    subscribeButtonLabel: str(c.subscribeButtonLabel, DEFAULT_FOOTER.subscribeButtonLabel),
    consentText: str(c.consentText, DEFAULT_FOOTER.consentText),
    privacyLabel: str(c.privacyLabel, DEFAULT_FOOTER.privacyLabel),
    privacyLink: str(c.privacyLink, DEFAULT_FOOTER.privacyLink),
    leftColumnTitle: str(c.leftColumnTitle, DEFAULT_FOOTER.leftColumnTitle),
    leftLinks: links(c.leftLinks, DEFAULT_FOOTER.leftLinks),
    rightColumnTitle: str(c.rightColumnTitle, DEFAULT_FOOTER.rightColumnTitle),
    rightLinks: links(c.rightLinks, DEFAULT_FOOTER.rightLinks),
    copyrightText: str(c.copyrightText, DEFAULT_FOOTER.copyrightText),
    partnerLogos: Array.isArray(c.partnerLogos) ? (c.partnerLogos as unknown[]).filter(x => typeof x === 'string') as string[] : [],
    partnerGroupTitle: str(c.partnerGroupTitle, DEFAULT_FOOTER.partnerGroupTitle),
    partnerGroupSubtitle: str(c.partnerGroupSubtitle, DEFAULT_FOOTER.partnerGroupSubtitle),
  }
}

function sectionToForm(section: HomePageSection): SectionForm {
  const c = (section.content && typeof section.content === 'object' && !Array.isArray(section.content))
    ? section.content as Record<string, unknown>
    : {}
  const cards: CardItem[] = Array.isArray(c.cards)
    ? (c.cards as Record<string,unknown>[]).map(card => ({
        title: String(card.title || ''), link: String(card.link || ''),
        image: String(card.image || ''), imageAlt: String(card.imageAlt || ''),
        linkLabel: String(card.linkLabel || 'Discover'),
      }))
    : []
  return {
    name: section.name, sectionKey: section.sectionKey, groupKey: section.groupKey,
    sectionType: section.sectionType, status: section.status, sortOrder: section.sortOrder,
    badge: section.badge || '', eyebrow: section.eyebrow || '',
    title: section.title || '', subtitle: section.subtitle || '', description: section.description || '',
    buttonLabel: section.buttonLabel || '', buttonLink: section.buttonLink || '',
    secondaryButtonLabel: section.secondaryButtonLabel || '', secondaryButtonLink: section.secondaryButtonLink || '',
    imageAlt: section.imageAlt || '',
    locationPlaceholder: String(c.locationPlaceholder || ''),
    secondaryTitle: String(c.secondaryTitle || ''),
    secondaryDescription: String(c.secondaryDescription || ''),
    cards,
  }
}

function buildContent(form: SectionForm): Record<string, unknown> {
  switch (form.sectionType) {
    case 'HERO':
      return { locationPlaceholder: form.locationPlaceholder }
    case 'TEXT':
      return { secondaryTitle: form.secondaryTitle, secondaryDescription: form.secondaryDescription }
    case 'LOCATION':
      return { cards: form.cards.map(({ _file: _f, ...card }) => card) }
    default:
      return {}
  }
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ section, onEdit, onDelete }: { section: HomePageSection; onEdit: () => void; onDelete: () => void }) {
  const imageUrl = section.image ? getApiAssetUrl(section.image) : null
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {imageUrl ? (
        <div className="h-32 flex-shrink-0"><img src={imageUrl} alt={section.imageAlt || section.name} className="w-full h-full object-cover" /></div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0">
          <PhotoIcon className="h-10 w-10 text-gray-300" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{section.name}</h3>
            <p className="text-xs text-gray-400 font-mono truncate">{section.sectionKey}</p>
          </div>
          <span className="text-xs font-mono text-gray-400 flex-shrink-0">#{section.sortOrder}</span>
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TYPE_COLORS[section.sectionType] || TYPE_COLORS.CUSTOM}`}>{section.sectionType}</span>
          {section.status === 'ACTIVE'
            ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full"><CheckCircleIcon className="h-3 w-3" /> Active</span>
            : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full"><XCircleIcon className="h-3 w-3" /> Inactive</span>}
        </div>
        {section.title && <p className="text-xs text-gray-500 line-clamp-1 mb-3 flex-1">{section.title}</p>}
        <div className="flex gap-2 mt-auto">
          <button onClick={onEdit} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <PencilIcon className="h-3.5 w-3.5" /> Edit
          </button>
          <button onClick={onDelete} className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
const monoInp = inp + ' font-mono'
const textarea = inp + ' resize-none'

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomepagePage() {
  const [tab, setTab] = useState<'sections'|'nav'|'footer'>('sections')

  // Sections
  const [sections, setSections] = useState<HomePageSection[]>([])
  const [loadingSections, setLoadingSections] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSection, setEditingSection] = useState<HomePageSection | null>(null)
  const [form, setForm] = useState<SectionForm>({ ...EMPTY_FORM })
  const [sectionImage, setSectionImage] = useState<File | null>(null)
  const [sectionImagePreview, setSectionImagePreview] = useState('')
  const [removeImage, setRemoveImage] = useState(false)
  const [sectionSaving, setSectionSaving] = useState(false)
  const [cardImageUploading, setCardImageUploading] = useState<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Nav
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [loadingNav, setLoadingNav] = useState(true)
  const [navSaving, setNavSaving] = useState(false)
  const [editingNav, setEditingNav] = useState<NavItem | null>(null)
  const [navForm, setNavForm] = useState({ label:'', href:'', visible:true, openInNewTab:false })
  const [showNavModal, setShowNavModal] = useState(false)

  // Footer
  const [footerSection, setFooterSection] = useState<HomePageSection | null>(null)
  const [footer, setFooter] = useState<FooterData>(DEFAULT_FOOTER)
  const [footerSaving, setFooterSaving] = useState(false)
  const [partnerLogoUploading, setPartnerLogoUploading] = useState(false)
  const partnerLogoInputRef = useRef<HTMLInputElement>(null)

  // Shared
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSections = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoadingSections(true)
    try {
      const r = await fetchAdminHomePageSections(token)
      if (r.success) {
        setSections(r.sections || [])
        const fs = (r.sections || []).find((s: HomePageSection) => s.sectionType === 'FOOTER' || s.sectionKey === 'hotels-newsletter-footer')
        if (fs) {
          setFooterSection(fs)
          const c = fs.content as Record<string,unknown> | null
          if (c && typeof c === 'object') setFooter(prev => ({ ...prev, ...parseFooterContent(c) }))
        }
      }
    } finally { setLoadingSections(false) }
  }, [])

  const loadNav = useCallback(async () => {
    setLoadingNav(true)
    try {
      const r = await fetchNavMenu()
      if (r.success) setNavItems(r.items || [])
    } finally { setLoadingNav(false) }
  }, [])

  useEffect(() => { loadSections(); loadNav() }, [loadSections, loadNav])

  // ── Section CRUD ────────────────────────────────────────────────────────────

  const sf = (updates: Partial<SectionForm>) => setForm(p => ({ ...p, ...updates }))

  const openCreate = () => {
    setEditingSection(null)
    setForm({ ...EMPTY_FORM, sortOrder: sections.length > 0 ? Math.max(...sections.map(s => s.sortOrder)) + 10 : 10 })
    setSectionImage(null); setSectionImagePreview(''); setRemoveImage(false)
    setError(''); setSuccess(''); setShowModal(true)
  }

  const openEdit = (section: HomePageSection) => {
    setEditingSection(section)
    setForm(sectionToForm(section))
    setSectionImage(null)
    setSectionImagePreview(section.image ? getApiAssetUrl(section.image) : '')
    setRemoveImage(false)
    setError(''); setSuccess(''); setShowModal(true)
  }

  const handleSectionImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSectionImage(file); setRemoveImage(false)
    if (file) setSectionImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleCardImageChange = async (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCardImageUploading(idx)
    try {
      const result = await uploadHomepageSectionImage(file)
      if (result.success && result.data?.fileUrl) {
        setForm(p => {
          const cards = [...p.cards]
          cards[idx] = { ...cards[idx], image: result.data!.fileUrl }
          return { ...p, cards }
        })
      }
    } finally { setCardImageUploading(null) }
  }

  const handleSectionSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSectionSaving(true); setError('')
    try {
      const contentJson = buildContent(form)
      const payload = {
        name: form.name.trim(), sectionKey: form.sectionKey.trim(),
        groupKey: form.groupKey.trim() || 'general',
        sectionType: form.sectionType, status: form.status, sortOrder: form.sortOrder,
        ...(form.badge && { badge: form.badge }),
        ...(form.eyebrow && { eyebrow: form.eyebrow }),
        ...(form.title && { title: form.title }),
        ...(form.subtitle && { subtitle: form.subtitle }),
        ...(form.description && { description: form.description }),
        ...(form.buttonLabel && { buttonLabel: form.buttonLabel }),
        ...(form.buttonLink && { buttonLink: form.buttonLink }),
        ...(form.secondaryButtonLabel && { secondaryButtonLabel: form.secondaryButtonLabel }),
        ...(form.secondaryButtonLink && { secondaryButtonLink: form.secondaryButtonLink }),
        ...(form.imageAlt && { imageAlt: form.imageAlt }),
        content: JSON.stringify(contentJson),
        ...(sectionImage && { image: sectionImage }),
        ...(removeImage && { removeImage: true }),
      }
      const result = editingSection
        ? await updateAdminHomePageSection(token, editingSection.id, payload as Parameters<typeof updateAdminHomePageSection>[2])
        : await createAdminHomePageSection(token, payload as Parameters<typeof createAdminHomePageSection>[1])
      if (result.success) { setSuccess(editingSection ? 'Section updated.' : 'Section created.'); setShowModal(false); await loadSections() }
      else setError(result.message || 'Failed to save section.')
    } finally { setSectionSaving(false) }
  }

  const handleDeleteSection = async (id: string, name: string) => {
    if (!confirm(`Delete section "${name}"?`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    try {
      const r = await deleteAdminHomePageSection(token, id)
      if (r.success) { setSections(prev => prev.filter(s => s.id !== id)); setSuccess('Section deleted.') }
      else setError(r.message || 'Failed to delete.')
    } catch { setError('Connection error.') }
  }

  // ── Nav ─────────────────────────────────────────────────────────────────────

  const openNavCreate = () => { setEditingNav(null); setNavForm({ label:'', href:'', visible:true, openInNewTab:false }); setShowNavModal(true) }
  const openNavEdit = (item: NavItem) => { setEditingNav(item); setNavForm({ label:item.label, href:item.href, visible:item.visible, openInNewTab:item.openInNewTab }); setShowNavModal(true) }
  const handleNavSave = () => {
    if (!navForm.label.trim() || !navForm.href.trim()) return
    if (editingNav) setNavItems(prev => prev.map(i => i.id === editingNav.id ? { ...i, ...navForm } : i))
    else setNavItems(prev => [...prev, { id: Date.now().toString(), ...navForm, order: prev.length }])
    setShowNavModal(false)
  }
  const moveNav = (idx: number, dir: -1|1) => setNavItems(prev => {
    const arr = [...prev]; const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return arr;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    return arr.map((item, i) => ({ ...item, order: i }))
  })
  const saveNav = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setNavSaving(true); setError('')
    try {
      const r = await saveNavMenu(token, navItems.map((item, i) => ({ ...item, order: i })))
      if (r.success) { setNavItems(r.items || navItems); setSuccess('Navigation menu saved.') }
      else setError(r.message || 'Failed to save.')
    } finally { setNavSaving(false) }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────

  const saveFooter = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token || !footerSection) return
    setFooterSaving(true); setError('')
    try {
      const r = await updateAdminHomePageSection(token, footerSection.id, { content: JSON.stringify(footer) } as Parameters<typeof updateAdminHomePageSection>[2])
      if (r.success) setSuccess('Footer saved.')
      else setError(r.message || 'Failed to save footer.')
    } finally { setFooterSaving(false) }
  }

  const handlePartnerLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''
    setPartnerLogoUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        const result = await uploadHomepageSectionImage(file)
        if (result.success && result.data?.fileUrl) uploaded.push(result.data.fileUrl)
      }
      if (uploaded.length) setFooter(prev => ({ ...prev, partnerLogos: [...prev.partnerLogos, ...uploaded] }))
    } finally { setPartnerLogoUploading(false) }
  }

  const updateLink = (side: 'leftLinks'|'rightLinks', idx: number, field: 'label'|'href', value: string) =>
    setFooter(prev => { const links = [...prev[side]]; links[idx] = { ...links[idx], [field]: value }; return { ...prev, [side]: links } })
  const addLink = (side: 'leftLinks'|'rightLinks') => setFooter(prev => ({ ...prev, [side]: [...prev[side], { label:'', href:'' }] }))
  const removeLink = (side: 'leftLinks'|'rightLinks', idx: number) => setFooter(prev => ({ ...prev, [side]: prev[side].filter((_,i) => i !== idx) }))

  // ── Cards helpers ───────────────────────────────────────────────────────────

  const addCard = () => setForm(p => ({ ...p, cards: [...p.cards, { title:'', link:'', image:'', imageAlt:'', linkLabel:'Discover' }] }))
  const removeCard = (idx: number) => setForm(p => ({ ...p, cards: p.cards.filter((_,i) => i !== idx) }))
  const updateCard = (idx: number, field: keyof CardItem, value: string) => setForm(p => {
    const cards = [...p.cards]; cards[idx] = { ...cards[idx], [field]: value }; return { ...p, cards }
  })

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Home Content</h1>
          <p className="mt-1 text-sm text-gray-500">Manage homepage sections, navigation menu, and footer.</p>
        </div>
        <div className="flex gap-2">
          {tab === 'sections' && <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"><PlusIcon className="h-4 w-4" /> Add Section</button>}
          {tab === 'nav' && <>
            <button onClick={openNavCreate} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"><PlusIcon className="h-4 w-4" /> Add Link</button>
            <button onClick={saveNav} disabled={navSaving} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">{navSaving ? 'Saving…' : 'Save Menu'}</button>
          </>}
          {tab === 'footer' && <button onClick={saveFooter} disabled={footerSaving || !footerSection} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">{footerSaving ? 'Saving…' : 'Save Footer'}</button>}
        </div>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['sections','nav','footer'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'sections' ? 'Homepage Sections' : t === 'nav' ? 'Navigation Menu' : 'Footer'}
            </button>
          ))}
        </nav>
      </div>

      {/* ── SECTIONS TAB ── */}
      {tab === 'sections' && (
        loadingSections ? <div className="py-12 text-center text-sm text-gray-400">Loading sections…</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...sections].sort((a,b) => a.sortOrder - b.sortOrder).map(section => (
              <SectionCard key={section.id} section={section} onEdit={() => openEdit(section)} onDelete={() => handleDeleteSection(section.id, section.name)} />
            ))}
            {sections.length === 0 && <div className="col-span-full py-16 text-center text-sm text-gray-400">No sections yet. Click <strong>Add Section</strong>.</div>}
          </div>
        )
      )}

      {/* ── NAV TAB ── */}
      {tab === 'nav' && (
        loadingNav ? <div className="py-12 text-center text-sm text-gray-400">Loading…</div> : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {navItems.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">No nav items yet.</div> : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-14">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Label</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Visible</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">New Tab</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {navItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveNav(idx,-1)} disabled={idx===0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUpIcon className="h-3.5 w-3.5" /></button>
                          <button onClick={() => moveNav(idx,1)} disabled={idx===navItems.length-1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDownIcon className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.label}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.href}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <button onClick={() => setNavItems(prev => prev.map(i => i.id===item.id ? { ...i, visible:!i.visible } : i))}>
                          {item.visible ? <EyeIcon className="h-4 w-4 text-green-500" /> : <EyeSlashIcon className="h-4 w-4 text-gray-300" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className={`text-xs font-medium ${item.openInNewTab ? 'text-blue-600' : 'text-gray-400'}`}>{item.openInNewTab ? 'Yes' : 'No'}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openNavEdit(item)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><PencilIcon className="h-3.5 w-3.5" /> Edit</button>
                          <button onClick={() => setNavItems(prev => prev.filter(i => i.id!==item.id))} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"><TrashIcon className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">Reorder with arrows · toggle visibility with the eye icon · click <strong>Save Menu</strong> to publish.</div>
          </div>
        )
      )}

      {/* ── FOOTER TAB ── */}
      {tab === 'footer' && (
        <div className="space-y-6 max-w-4xl">
          {!footerSection && <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">No footer section found. Create a section with type <strong>FOOTER</strong> first.</div>}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Newsletter & Brand</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([['partnerGroupSubtitle','Partner Group Subtitle (e.g. "Part of the")'],['partnerGroupTitle','Partner Group Title (e.g. "Dalata Hotel Group")'],['newsletterTitle','Newsletter Title'],['subscribeButtonLabel','Subscribe Button Label'],['consentText','Consent Text'],['privacyLabel','Privacy Policy Label'],['privacyLink','Privacy Policy URL'],['copyrightText','Copyright Text']] as [keyof FooterData, string][]).map(([field, label]) => (
                <div key={field} className={field === 'consentText' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input className={inp} value={footer[field] as string} onChange={e => setFooter(prev => ({ ...prev, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Partner Logos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Partner Logos</h3>
                <p className="text-xs text-gray-400 mt-0.5">Logos shown at the bottom of the footer.</p>
              </div>
              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 border border-dashed border-gray-400 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600 ${partnerLogoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <PhotoIcon className="h-4 w-4 text-gray-400" />
                {partnerLogoUploading ? 'Uploading…' : 'Upload Logos'}
                <input ref={partnerLogoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePartnerLogoUpload} />
              </label>
            </div>
            {footer.partnerLogos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-400">No partner logos yet.</div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {footer.partnerLogos.map((logo, i) => (
                  <div key={i} className="relative group">
                    <div className="h-20 w-32 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-2">
                      <img src={getApiAssetUrl(logo)} alt="" className="h-full w-full object-contain" />
                    </div>
                    <button type="button" onClick={() => setFooter(prev => ({ ...prev, partnerLogos: prev.partnerLogos.filter((_,j) => j!==i) }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">✕</button>
                    <p className="text-[10px] text-gray-400 text-center mt-1">Logo {i+1}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(['leftLinks','rightLinks'] as const).map(side => (
            <div key={side} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{side === 'leftLinks' ? 'Left' : 'Right'} Column Links</h3>
                <button onClick={() => addLink(side)} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"><PlusIcon className="h-4 w-4" /> Add Link</button>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Column Title</label>
                <input className={inp} value={side==='leftLinks' ? footer.leftColumnTitle : footer.rightColumnTitle}
                  onChange={e => setFooter(prev => ({ ...prev, [side==='leftLinks' ? 'leftColumnTitle' : 'rightColumnTitle']: e.target.value }))} />
              </div>
              <div className="space-y-2">
                {footer[side].map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input className={inp} placeholder="Label" value={link.label} onChange={e => updateLink(side, idx, 'label', e.target.value)} />
                    <input className={monoInp} placeholder="/url" value={link.href} onChange={e => updateLink(side, idx, 'href', e.target.value)} />
                    <button onClick={() => removeLink(side, idx)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">{editingSection ? `Edit: ${editingSection.name}` : 'New Section'}</h2>
                {form.sectionType && <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-1 ${TYPE_COLORS[form.sectionType] || TYPE_COLORS.CUSTOM}`}>{form.sectionType}</span>}
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
            </div>

            <form onSubmit={handleSectionSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {/* ── Basic Info ── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b">Section Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Section Name *">
                    <input required className={inp} value={form.name} onChange={e => sf({ name: e.target.value })} placeholder="e.g. Dining Feature" />
                  </Field>
                  <Field label={`Section Key * ${editingSection ? '(read-only)' : '(slug format)'}`}>
                    <input required className={monoInp + (editingSection ? ' bg-gray-50 text-gray-500' : '')} value={form.sectionKey}
                      onChange={e => sf({ sectionKey: e.target.value.toLowerCase().replace(/\s+/g,'-') })} placeholder="hotels-dining-feature" readOnly={!!editingSection} />
                  </Field>
                  <Field label="Section Type">
                    <select className={inp} value={form.sectionType} onChange={e => sf({ sectionType: e.target.value as HomePageSectionType })}>
                      {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Group Key">
                    <input className={monoInp} value={form.groupKey} onChange={e => sf({ groupKey: e.target.value })} placeholder="general" />
                  </Field>
                  <Field label="Status">
                    <select className={inp} value={form.status} onChange={e => sf({ status: e.target.value as HomePageSectionStatus })}>
                      <option value="ACTIVE">Active — visible on site</option>
                      <option value="INACTIVE">Inactive — hidden from site</option>
                    </select>
                  </Field>
                  <Field label="Sort Order">
                    <input type="number" className={inp} value={form.sortOrder} onChange={e => sf({ sortOrder: Number(e.target.value) })} />
                  </Field>
                </div>
              </div>

              {/* ── Content fields (type-aware) ── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b">Content</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Fields shown for most types */}
                  {form.sectionType !== 'LOCATION' && (<>
                    {['HERO','TEXT','CTA','NEWSLETTER','CUSTOM'].includes(form.sectionType) && (
                      <Field label="Badge / Label"><input className={inp} value={form.badge} onChange={e => sf({ badge: e.target.value })} placeholder="e.g. HOTELS" /></Field>
                    )}
                    {['HERO','FEATURE','CTA','NEWSLETTER','CUSTOM'].includes(form.sectionType) && (
                      <Field label="Eyebrow Text"><input className={inp} value={form.eyebrow} onChange={e => sf({ eyebrow: e.target.value })} placeholder="Small text above title" /></Field>
                    )}
                    <Field label="Title" span2={form.sectionType === 'TEXT'}>
                      <input className={inp} value={form.title} onChange={e => sf({ title: e.target.value })} placeholder="Main heading" />
                    </Field>
                    {['HERO','FEATURE','CTA','NEWSLETTER','CUSTOM'].includes(form.sectionType) && (
                      <Field label="Subtitle / Bold Title">
                        <input className={inp} value={form.subtitle} onChange={e => sf({ subtitle: e.target.value })} placeholder="Highlighted subtitle" />
                      </Field>
                    )}
                    <Field label="Description" span2>
                      <textarea rows={3} className={textarea} value={form.description} onChange={e => sf({ description: e.target.value })} placeholder="Body text shown in this section" />
                    </Field>
                  </>)}

                  {/* TEXT — secondary block */}
                  {form.sectionType === 'TEXT' && (<>
                    <Field label="Secondary Title">
                      <input className={inp} value={form.secondaryTitle} onChange={e => sf({ secondaryTitle: e.target.value })} placeholder="e.g. Our Locations" />
                    </Field>
                    <Field label="Secondary Description" span2>
                      <textarea rows={3} className={textarea} value={form.secondaryDescription} onChange={e => sf({ secondaryDescription: e.target.value })} placeholder="Description for the secondary block (e.g. locations intro)" />
                    </Field>
                  </>)}

                  {/* HERO — location placeholder */}
                  {form.sectionType === 'HERO' && (
                    <Field label="Location Search Placeholder">
                      <input className={inp} value={form.locationPlaceholder} onChange={e => sf({ locationPlaceholder: e.target.value })} placeholder="e.g. Choose your location" />
                    </Field>
                  )}

                  {/* LOCATION — cards editor */}
                  {form.sectionType === 'LOCATION' && (
                    <div className="sm:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Location Cards</p>
                        <button type="button" onClick={addCard} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                          <PlusIcon className="h-4 w-4" /> Add Card
                        </button>
                      </div>
                      {form.cards.length === 0 && <p className="text-sm text-gray-400">No cards yet. Click Add Card.</p>}
                      {form.cards.map((card, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Card {idx + 1}</span>
                            <button type="button" onClick={() => removeCard(idx)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1"><TrashIcon className="h-3.5 w-3.5" /> Remove</button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                              <input className={inp} value={card.title} onChange={e => updateCard(idx, 'title', e.target.value)} placeholder="e.g. Luxotel Amman Grand" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Link URL</label>
                              <input className={monoInp} value={card.link} onChange={e => updateCard(idx, 'link', e.target.value)} placeholder="/hotels/amman" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Button Label</label>
                              <input className={inp} value={card.linkLabel} onChange={e => updateCard(idx, 'linkLabel', e.target.value)} placeholder="Discover" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Image</label>
                              {card.image ? (
                                <div className="relative group inline-block">
                                  <img src={getApiAssetUrl(card.image)} alt="" className="h-16 w-24 object-cover rounded-lg border border-gray-200" />
                                  <button type="button" onClick={() => updateCard(idx, 'image', '')}
                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                </div>
                              ) : (
                                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-gray-300 rounded-lg bg-white text-xs text-gray-500 hover:bg-gray-50 transition-colors ${cardImageUploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <PhotoIcon className="h-4 w-4 text-gray-400" />
                                  {cardImageUploading === idx ? 'Uploading…' : 'Upload Image'}
                                  <input type="file" accept="image/*" className="hidden" onChange={e => handleCardImageChange(idx, e)} />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Buttons ── */}
              {['HERO','FEATURE','CTA','NEWSLETTER','CUSTOM'].includes(form.sectionType) && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b">Buttons</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Primary Button Label"><input className={inp} value={form.buttonLabel} onChange={e => sf({ buttonLabel: e.target.value })} placeholder="e.g. Book Now" /></Field>
                    <Field label="Primary Button URL"><input className={monoInp} value={form.buttonLink} onChange={e => sf({ buttonLink: e.target.value })} placeholder="/booking" /></Field>
                    <Field label="Secondary Button Label"><input className={inp} value={form.secondaryButtonLabel} onChange={e => sf({ secondaryButtonLabel: e.target.value })} /></Field>
                    <Field label="Secondary Button URL"><input className={monoInp} value={form.secondaryButtonLink} onChange={e => sf({ secondaryButtonLink: e.target.value })} /></Field>
                  </div>
                </div>
              )}

              {/* ── Image ── */}
              {form.sectionType !== 'TEXT' && form.sectionType !== 'FOOTER' && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b">
                    {form.sectionType === 'LOCATION' ? 'Section Background Image (optional)' : 'Background / Feature Image'}
                  </h3>
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0">
                      {sectionImagePreview && !removeImage ? (
                        <div className="relative">
                          <img src={sectionImagePreview} alt="" className="h-28 w-44 object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => { setSectionImage(null); setSectionImagePreview(''); setRemoveImage(!!editingSection?.image) }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
                        </div>
                      ) : (
                        <div className="h-28 w-44 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center"><PhotoIcon className="h-8 w-8 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 border border-dashed border-gray-400 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600">
                        <PhotoIcon className="h-4 w-4 text-gray-400" /> Upload Image
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleSectionImageChange} />
                      </label>
                      <input className={inp} placeholder="Alt text for accessibility" value={form.imageAlt} onChange={e => sf({ imageAlt: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4 flex-shrink-0">
              <button onClick={handleSectionSubmit as unknown as React.MouseEventHandler} disabled={sectionSaving}
                className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
                {sectionSaving ? 'Saving…' : editingSection ? 'Update Section' : 'Create Section'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 text-sm font-semibold transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAV MODAL ── */}
      {showNavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">{editingNav ? 'Edit Link' : 'Add Link'}</h2>
              <button onClick={() => setShowNavModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Label *</label><input className={inp} value={navForm.label} onChange={e => setNavForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Hotels" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">URL *</label><input className={monoInp} value={navForm.href} onChange={e => setNavForm(p => ({ ...p, href: e.target.value }))} placeholder="/hotels" /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={navForm.visible} onChange={e => setNavForm(p => ({ ...p, visible: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary-600" /> Visible
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={navForm.openInNewTab} onChange={e => setNavForm(p => ({ ...p, openInNewTab: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary-600" /> New tab
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleNavSave} disabled={!navForm.label.trim()||!navForm.href.trim()} className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">{editingNav ? 'Update' : 'Add'}</button>
                <button onClick={() => setShowNavModal(false)} className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 text-sm font-semibold transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
