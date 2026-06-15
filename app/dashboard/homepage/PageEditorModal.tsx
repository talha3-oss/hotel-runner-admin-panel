'use client'

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  PhotoIcon, ChevronUpIcon, ChevronDownIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'
import {
  fetchAdminPages, fetchAdminPageById, updateLandingPage,
  uploadHomepageSectionImage, getApiAssetUrl, createAdminContentPage,
} from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = 'hero' | 'text' | 'cards' | 'offers' | 'cta' | 'contact-info' | 'form' | 'sitemap'

interface CardItem     { icon: string; title: string; text: string }
interface OfferItem    { title: string; badge: string; description: string; highlight: string; image: string; includes: string[] }
interface ContactItem  { icon: string; label: string; value: string }
interface SitemapLink  { label: string; href: string }
interface SitemapColumn{ title: string; links: SitemapLink[] }

interface ContentSection {
  type: SectionType
  title?: string
  subtitle?: string
  content?: string
  image?: string
  buttonLabel?: string
  buttonHref?: string
  contactNote?: string
  items?: (CardItem | OfferItem | ContactItem)[]
  columns?: SitemapColumn[]
}

// ─── Section type metadata ────────────────────────────────────────────────────

const SECTION_TYPES: { value: SectionType; label: string; desc: string }[] = [
  { value: 'hero',         label: 'Hero Banner',    desc: 'Large heading with background image' },
  { value: 'text',         label: 'Text Block',     desc: 'Title and rich text paragraph' },
  { value: 'cards',        label: 'Cards Grid',     desc: 'Feature cards with icon + title + text' },
  { value: 'offers',       label: 'Offers',         desc: 'Offer cards with image and highlights' },
  { value: 'cta',          label: 'Call to Action', desc: 'Centred CTA with title and button' },
  { value: 'contact-info', label: 'Contact Info',   desc: 'List of phone / email / address items' },
  { value: 'form',         label: 'Contact Form',   desc: 'Embedded enquiry form' },
  { value: 'sitemap',      label: 'Sitemap',        desc: 'Link columns for a sitemap page' },
]

const TYPE_COLORS: Record<SectionType, string> = {
  hero:          'bg-purple-100 text-purple-700 border-purple-200',
  text:          'bg-blue-100 text-blue-700 border-blue-200',
  cards:         'bg-green-100 text-green-700 border-green-200',
  offers:        'bg-orange-100 text-orange-700 border-orange-200',
  cta:           'bg-yellow-100 text-yellow-700 border-yellow-200',
  'contact-info':'bg-teal-100 text-teal-700 border-teal-200',
  form:          'bg-pink-100 text-pink-700 border-pink-200',
  sitemap:       'bg-gray-100 text-gray-700 border-gray-200',
}

// ─── Default items for new sections ──────────────────────────────────────────

const DEFAULT_CARDS: CardItem[] = [
  { icon: 'star',     title: 'World-Class Service',  text: 'Our dedicated team ensures every stay exceeds expectations.' },
  { icon: 'shield',   title: 'Safe & Secure',        text: 'Your safety and privacy are our highest priority.' },
  { icon: 'sparkles', title: 'Luxury Amenities',     text: 'Enjoy premium facilities including spa, pool, and fine dining.' },
]

const DEFAULT_OFFERS: OfferItem[] = [
  {
    title: 'Weekend Getaway', badge: 'Popular',
    description: 'Escape the city for a luxurious weekend retreat.',
    highlight: 'From £149 / night',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
    includes: ['Breakfast for two', 'Spa access', 'Late checkout until 2 pm'],
  },
  {
    title: 'Corporate Stay', badge: 'Business',
    description: 'Ideal rates for extended business trips with all the essentials.',
    highlight: 'From £99 / night',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    includes: ['High-speed Wi-Fi', 'Meeting room access', 'Daily breakfast'],
  },
]

const DEFAULT_CONTACTS: ContactItem[] = [
  { icon: 'phone',    label: 'Phone',   value: '+44 20 7123 4567' },
  { icon: 'email',    label: 'Email',   value: 'info@luxotel.com' },
  { icon: 'location', label: 'Address', value: '123 Park Lane, London, W1K 7AB' },
  { icon: 'clock',    label: 'Hours',   value: 'Monday – Sunday, 24 hours' },
]

const DEFAULT_SITEMAP_COLS: SitemapColumn[] = [
  { title: 'Our Hotels', links: [{ label: 'London', href: '/hotels/london' }, { label: 'Manchester', href: '/hotels/manchester' }] },
  { title: 'Services',   links: [{ label: 'Spa & Wellness', href: '/spa' }, { label: 'Dining', href: '/dining' }] },
  { title: 'Help',       links: [{ label: 'FAQs', href: '/faqs' }, { label: 'Contact Us', href: '/contact' }] },
  { title: 'Company',    links: [{ label: 'About Luxotel', href: '/about' }, { label: 'Careers', href: '/careers' }] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inp     = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
const monoInp = inp + ' font-mono'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-5 mt-1">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{children}</h4>
    </div>
  )
}

function buildEmpty(type: SectionType): ContentSection {
  if (type === 'hero')         return { type, title: '', subtitle: '', image: '', buttonLabel: 'Book Now', buttonHref: '/booking' }
  if (type === 'text')         return { type, title: '', content: '' }
  if (type === 'cards')        return { type, title: 'Why Choose Luxotel', items: DEFAULT_CARDS }
  if (type === 'offers')       return { type, title: 'Current Offers', subtitle: 'Exclusive deals for every occasion', items: DEFAULT_OFFERS }
  if (type === 'cta')          return { type, title: 'Ready to Experience Luxury?', subtitle: 'Book your stay today and enjoy exclusive benefits.', buttonLabel: 'Book Now', buttonHref: '/booking', contactNote: '' }
  if (type === 'contact-info') return { type, title: 'Get in Touch', items: DEFAULT_CONTACTS }
  if (type === 'form')         return { type, title: 'Send Us a Message', content: '' }
  if (type === 'sitemap')      return { type, title: 'Site Map', columns: DEFAULT_SITEMAP_COLS }
  return { type }
}

// ─── Image Upload Box ─────────────────────────────────────────────────────────

function ImageUploadBox({ value, onChange, label = 'Background Image' }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadHomepageSectionImage(file)
      if (result.success && result.data?.fileUrl) onChange(result.data.fileUrl)
      else if (result.success && result.data?.fileUrl) onChange(result.data.fileUrl)
    } finally { setUploading(false); if (ref.current) ref.current.value = '' }
  }

  const imgSrc = value ? (value.startsWith('http') ? value : getApiAssetUrl(value)) : ''

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        {imgSrc ? (
          <img src={imgSrc} alt="" className="h-24 w-40 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
        ) : (
          <div className="h-24 w-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 bg-gray-50">
            <PhotoIcon className="h-7 w-7 text-gray-300" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload Image'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')}
              className="px-4 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
              Remove
            </button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" />
      </div>
    </div>
  )
}

// ─── Section Form Modal ───────────────────────────────────────────────────────

function SectionFormModal({ initial, isNew, onSave, onClose }: {
  initial: ContentSection; isNew: boolean
  onSave: (s: ContentSection) => void; onClose: () => void
}) {
  const [s, setS] = useState<ContentSection>(initial)
  const set = (patch: Partial<ContentSection>) => setS(prev => ({ ...prev, ...patch }))
  const setType = (type: SectionType) => setS(buildEmpty(type))

  // ── CARDS
  const cards = (s.items || []) as CardItem[]
  const setCards = (items: CardItem[]) => set({ items })
  const addCard = () => setCards([...cards, { icon: 'star', title: '', text: '' }])
  const rmCard  = (i: number) => setCards(cards.filter((_, j) => j !== i))
  const updCard = (i: number, f: keyof CardItem, v: string) => {
    const arr = [...cards]; arr[i] = { ...arr[i], [f]: v }; setCards(arr)
  }

  // ── OFFERS
  const offers = (s.items || []) as OfferItem[]
  const setOffers = (items: OfferItem[]) => set({ items })
  const addOffer  = () => setOffers([...offers, { title: '', badge: '', description: '', highlight: '', image: '', includes: [] }])
  const rmOffer   = (i: number) => setOffers(offers.filter((_, j) => j !== i))
  const updOffer  = (i: number, f: keyof Omit<OfferItem,'includes'>, v: string) => {
    const arr = [...offers]; arr[i] = { ...arr[i], [f]: v }; setOffers(arr)
  }
  const updOfferIncludes = (i: number, raw: string) => {
    const arr = [...offers]; arr[i] = { ...arr[i], includes: raw.split('\n').map(x => x.trim()).filter(Boolean) }; setOffers(arr)
  }
  const [offerImgUploading, setOfferImgUploading] = useState<number | null>(null)
  const offerImgRefs = useRef<(HTMLInputElement | null)[]>([])
  const handleOfferImg = async (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setOfferImgUploading(i)
    try {
      const result = await uploadHomepageSectionImage(file)
      if (result.success) updOffer(i, 'image', result.data?.fileUrl || '')
    } finally { setOfferImgUploading(null) }
  }

  // ── CONTACT-INFO
  const contacts = (s.items || []) as ContactItem[]
  const setContacts = (items: ContactItem[]) => set({ items })
  const addContact  = () => setContacts([...contacts, { icon: 'phone', label: '', value: '' }])
  const rmContact   = (i: number) => setContacts(contacts.filter((_, j) => j !== i))
  const updContact  = (i: number, f: keyof ContactItem, v: string) => {
    const arr = [...contacts]; arr[i] = { ...arr[i], [f]: v }; setContacts(arr)
  }

  // ── SITEMAP
  const cols = (s.columns || []) as SitemapColumn[]
  const setCols = (columns: SitemapColumn[]) => set({ columns })
  const addCol  = () => setCols([...cols, { title: '', links: [] }])
  const rmCol   = (ci: number) => setCols(cols.filter((_, j) => j !== ci))
  const updColTitle = (ci: number, title: string) => {
    const arr = [...cols]; arr[ci] = { ...arr[ci], title }; setCols(arr)
  }
  const addColLink = (ci: number) => {
    const arr = [...cols]; arr[ci] = { ...arr[ci], links: [...arr[ci].links, { label: '', href: '' }] }; setCols(arr)
  }
  const rmColLink = (ci: number, li: number) => {
    const arr = [...cols]; arr[ci] = { ...arr[ci], links: arr[ci].links.filter((_, j) => j !== li) }; setCols(arr)
  }
  const updColLink = (ci: number, li: number, f: keyof SitemapLink, v: string) => {
    const arr = [...cols]
    const links = [...arr[ci].links]; links[li] = { ...links[li], [f]: v }
    arr[ci] = { ...arr[ci], links }; setCols(arr)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{isNew ? 'Add Section' : 'Edit Section'}</h3>
            <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-1 ${TYPE_COLORS[s.type]}`}>{s.type}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[78vh]">

          {/* ── Type picker (new only) */}
          {isNew && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Section Type</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_TYPES.map(st => (
                  <button key={st.value} type="button" onClick={() => setType(st.value)}
                    className={`text-left p-3 rounded-xl border text-sm transition-all ${s.type === st.value ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <div className="font-medium text-gray-900">{st.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ HERO ══ */}
          {s.type === 'hero' && (<>
            <SectionHeading>Hero Content</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="e.g. Welcome to Luxotel" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subheading</label>
              <input className={inp} value={s.subtitle || ''} onChange={e => set({ subtitle: e.target.value })} placeholder="e.g. Luxury redefined across the world" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                <input className={inp} value={s.buttonLabel || ''} onChange={e => set({ buttonLabel: e.target.value })} placeholder="Book Now" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
                <input className={monoInp} value={s.buttonHref || ''} onChange={e => set({ buttonHref: e.target.value })} placeholder="/booking" />
              </div>
            </div>
            <ImageUploadBox value={s.image || ''} onChange={url => set({ image: url })} />
          </>)}

          {/* ══ TEXT ══ */}
          {s.type === 'text' && (<>
            <SectionHeading>Text Content</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Section heading" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea rows={7} className={inp + ' resize-none'} value={s.content || ''} onChange={e => set({ content: e.target.value })}
                placeholder="Write your paragraph here. Use **bold**, *italic*, ## Heading, or - list items." />
            </div>
          </>)}

          {/* ══ CARDS ══ */}
          {s.type === 'cards' && (<>
            <SectionHeading>Cards Section</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="e.g. Why Choose Luxotel" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="text-sm font-medium text-gray-700">Cards</label>
              <button type="button" onClick={addCard}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700">
                <PlusIcon className="h-4 w-4" /> Add Card
              </button>
            </div>
            {cards.length === 0 && <p className="text-sm text-gray-400">No cards yet.</p>}
            <div className="space-y-3">
              {cards.map((card, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Card {i + 1}</span>
                    <button type="button" onClick={() => rmCard(i)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                      <TrashIcon className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Icon name</label>
                      <input className={inp} value={card.icon} onChange={e => updCard(i, 'icon', e.target.value)} placeholder="star" />
                      <p className="text-[10px] text-gray-400 mt-1">star · shield · sparkles · phone · email · clock · location · check</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input className={inp} value={card.title} onChange={e => updCard(i, 'title', e.target.value)} placeholder="Feature title" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input className={inp} value={card.text} onChange={e => updCard(i, 'text', e.target.value)} placeholder="Short description." />
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {/* ══ OFFERS ══ */}
          {s.type === 'offers' && (<>
            <SectionHeading>Offers Section</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Current Offers" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input className={inp} value={s.subtitle || ''} onChange={e => set({ subtitle: e.target.value })} placeholder="Exclusive deals…" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="text-sm font-medium text-gray-700">Offer Cards</label>
              <button type="button" onClick={addOffer}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700">
                <PlusIcon className="h-4 w-4" /> Add Offer
              </button>
            </div>
            {offers.length === 0 && <p className="text-sm text-gray-400">No offers yet.</p>}
            <div className="space-y-4">
              {offers.map((offer, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Offer {i + 1}</span>
                    <button type="button" onClick={() => rmOffer(i)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                      <TrashIcon className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input className={inp} value={offer.title} onChange={e => updOffer(i, 'title', e.target.value)} placeholder="Weekend Getaway" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Badge</label>
                      <input className={inp} value={offer.badge} onChange={e => updOffer(i, 'badge', e.target.value)} placeholder="Popular" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input className={inp} value={offer.description} onChange={e => updOffer(i, 'description', e.target.value)} placeholder="Short description." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Price Highlight</label>
                      <input className={inp} value={offer.highlight} onChange={e => updOffer(i, 'highlight', e.target.value)} placeholder="From £149 / night" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Card Image</label>
                      {offer.image ? (
                        <div className="flex items-center gap-2">
                          <img src={offer.image.startsWith('http') ? offer.image : getApiAssetUrl(offer.image)}
                            alt="" className="h-12 w-20 rounded-lg object-cover border border-gray-200" />
                          <button type="button" onClick={() => updOffer(i, 'image', '')} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                      ) : (
                        <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-gray-300 rounded-lg bg-white text-xs text-gray-500 hover:bg-gray-50 ${offerImgUploading === i ? 'opacity-50 pointer-events-none' : ''}`}>
                          <PhotoIcon className="h-4 w-4 text-gray-400" />
                          {offerImgUploading === i ? 'Uploading…' : 'Upload Image'}
                          <input type="file" accept="image/*" className="hidden"
                            ref={el => { offerImgRefs.current[i] = el }}
                            onChange={e => handleOfferImg(i, e)} />
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">What&apos;s Included <span className="text-gray-400 font-normal">(one item per line)</span></label>
                    <textarea rows={3} className={inp + ' resize-none text-xs'}
                      value={offer.includes.join('\n')}
                      onChange={e => updOfferIncludes(i, e.target.value)}
                      placeholder={'Breakfast for two\nSpa access\nLate checkout'} />
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {/* ══ CTA ══ */}
          {s.type === 'cta' && (<>
            <SectionHeading>Call to Action</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Ready to Experience Luxury?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtext</label>
              <input className={inp} value={s.subtitle || ''} onChange={e => set({ subtitle: e.target.value })} placeholder="Book your stay today and enjoy exclusive benefits." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                <input className={inp} value={s.buttonLabel || ''} onChange={e => set({ buttonLabel: e.target.value })} placeholder="Book Now" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
                <input className={monoInp} value={s.buttonHref || ''} onChange={e => set({ buttonHref: e.target.value })} placeholder="/booking" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Note <span className="text-xs text-gray-400 font-normal">(optional — shown below button)</span></label>
              <input className={inp} value={s.contactNote || ''} onChange={e => set({ contactNote: e.target.value })} placeholder="Email: info@luxotel.com  |  Phone: +44 20 7123 4567" />
            </div>
            <ImageUploadBox value={s.image || ''} onChange={url => set({ image: url })} label="Background Image (optional)" />
          </>)}

          {/* ══ CONTACT-INFO ══ */}
          {s.type === 'contact-info' && (<>
            <SectionHeading>Contact Details</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Get in Touch" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="text-sm font-medium text-gray-700">Contact Items</label>
              <button type="button" onClick={addContact}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700">
                <PlusIcon className="h-4 w-4" /> Add Item
              </button>
            </div>
            {contacts.length === 0 && <p className="text-sm text-gray-400">No items yet.</p>}
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex gap-3 items-end border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="w-28 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                    <input className={inp} value={c.icon} onChange={e => updContact(i, 'icon', e.target.value)} placeholder="phone" />
                    <p className="text-[10px] text-gray-400 mt-0.5">phone / email / location / clock / fax / web</p>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                    <input className={inp} value={c.label} onChange={e => updContact(i, 'label', e.target.value)} placeholder="Phone" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                    <input className={inp} value={c.value} onChange={e => updContact(i, 'value', e.target.value)} placeholder="+44 20 7123 4567" />
                  </div>
                  <button type="button" onClick={() => rmContact(i)} className="p-2 text-red-400 hover:text-red-600 flex-shrink-0 mb-0.5">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>)}

          {/* ══ FORM ══ */}
          {s.type === 'form' && (<>
            <SectionHeading>Contact Form</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Send Us a Message" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intro Text <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
              <textarea rows={3} className={inp + ' resize-none'} value={s.content || ''} onChange={e => set({ content: e.target.value })}
                placeholder="We'd love to hear from you. Fill in the form and we'll get back within 24 hours." />
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              The form fields (name, email, message, submit) are rendered automatically on the frontend.
            </div>
          </>)}

          {/* ══ SITEMAP ══ */}
          {s.type === 'sitemap' && (<>
            <SectionHeading>Sitemap Columns</SectionHeading>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
              <input className={inp} value={s.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Site Map" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="text-sm font-medium text-gray-700">Columns</label>
              <button type="button" onClick={addCol}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700">
                <PlusIcon className="h-4 w-4" /> Add Column
              </button>
            </div>
            {cols.length === 0 && <p className="text-sm text-gray-400">No columns yet.</p>}
            <div className="space-y-4">
              {cols.map((col, ci) => (
                <div key={ci} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Column Title</label>
                      <input className={inp} value={col.title} onChange={e => updColTitle(ci, e.target.value)} placeholder="Our Hotels" />
                    </div>
                    <button type="button" onClick={() => rmCol(ci)} className="text-red-400 hover:text-red-600 mt-4">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 pl-1">
                    {col.links.map((lnk, li) => (
                      <div key={li} className="flex gap-2 items-center">
                        <input className={inp} value={lnk.label} onChange={e => updColLink(ci, li, 'label', e.target.value)} placeholder="Page name" />
                        <input className={monoInp} value={lnk.href} onChange={e => updColLink(ci, li, 'href', e.target.value)} placeholder="/page" />
                        <button type="button" onClick={() => rmColLink(ci, li)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addColLink(ci)}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium pt-1">
                      <PlusIcon className="h-3.5 w-3.5" /> Add Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>)}

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={() => onSave(s)}
            className="flex-1 py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
            {isNew ? 'Add Section' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page Editor Modal ────────────────────────────────────────────────────────

export default function PageEditorModal({ slug, pageName, onClose }: {
  slug: string; pageName: string; onClose: () => void
}) {
  const [pageId,       setPageId]       = useState<string | null>(null)
  const [sections,     setSections]     = useState<ContentSection[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [saved,        setSaved]        = useState(false)
  const [showForm,     setShowForm]     = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true); setError('')
    try {
      const pagesResult = await fetchAdminPages(token)
      if (!pagesResult.success) { setError('Failed to load pages.'); return }
      let page = (pagesResult.pages || []).find((p: { slug: string }) => p.slug === slug)
      if (!page) {
        // Auto-create the page so any nav/footer link can be edited immediately
        const created = await createAdminContentPage(token, pageName || slug, slug)
        if (!created.success) { setError('Could not create page. Check the backend is running.'); return }
        page = created.page
      }
      setPageId(page.id)
      const detail = await fetchAdminPageById(token, page.id)
      if (detail.success) setSections(Array.isArray(detail.page?.sections) ? detail.page.sections : [])
    } catch { setError('Connection error.') }
    finally { setLoading(false) }
  }, [slug, pageName])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!pageId) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true); setError('')
    try {
      const result = await updateLandingPage(token, pageId, { sections })
      if (result.success) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
      else setError(result.message || 'Save failed.')
    } catch { setError('Connection error.') }
    finally { setSaving(false) }
  }

  const move = (i: number, dir: -1 | 1) => setSections(prev => {
    const arr = [...prev]; const j = i + dir
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]]; return arr
  })

  const del = (i: number) => {
    if (!confirm('Remove this section?')) return
    setSections(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = (section: ContentSection) => {
    setSections(prev => {
      const arr = [...prev]
      if (editingIndex !== null) arr[editingIndex] = section
      else arr.push(section)
      return arr
    })
    setShowForm(false)
  }

  const PAGE_ICONS: Record<string, string> = {
    contact: '📞', 'special-offers': '🏷️', 'gift-cards': '🎁', sitemap: '🗺️', 'corporate-rates': '💼',
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{PAGE_ICONS[slug] || '📄'}</span>
              <div>
                <h2 className="font-bold text-gray-900">{pageName}</h2>
                <span className="text-xs font-mono text-gray-400">/{slug}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                  <CheckCircleIcon className="h-4 w-4" /> Saved!
                </span>
              )}
              {error && <span className="text-sm text-red-600">{error}</span>}
              <button onClick={() => { setEditingIndex(null); setShowForm(true) }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                <PlusIcon className="h-4 w-4" /> Add Section
              </button>
              <button onClick={save} disabled={saving || !pageId}
                className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-semibold">
                {saving ? 'Saving…' : 'Save Page'}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : sections.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
                <p className="text-gray-400 mb-4">No sections yet. Add your first section to build this page.</p>
                <button onClick={() => { setEditingIndex(null); setShowForm(true) }}
                  className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                  <PlusIcon className="h-4 w-4 inline mr-1.5" />Add First Section
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((sec, i) => {
                  const meta   = SECTION_TYPES.find(t => t.value === sec.type)
                  const imgSrc = sec.image ? (sec.image.startsWith('http') ? sec.image : getApiAssetUrl(sec.image)) : ''
                  return (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-20"><ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" /></button>
                        <span className="text-xs text-gray-300 font-mono w-4 text-center">{i + 1}</span>
                        <button onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-20"><ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" /></button>
                      </div>
                      {imgSrc && (
                        <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TYPE_COLORS[sec.type]}`}>
                            {meta?.label || sec.type}
                          </span>
                          {sec.title && <span className="text-sm font-semibold text-gray-900 truncate">{sec.title}</span>}
                        </div>
                        {sec.subtitle && <p className="text-xs text-gray-400 truncate">{sec.subtitle}</p>}
                        {sec.content  && <p className="text-xs text-gray-400 truncate">{sec.content.slice(0, 80)}</p>}
                        {Array.isArray(sec.items)   && <p className="text-xs text-gray-400">{sec.items.length} item{sec.items.length !== 1 ? 's' : ''}</p>}
                        {Array.isArray(sec.columns) && <p className="text-xs text-gray-400">{sec.columns.length} column{sec.columns.length !== 1 ? 's' : ''}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingIndex(i); setShowForm(true) }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white rounded-lg hover:bg-gray-50">
                          <PencilIcon className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => del(i)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">
              Click <strong>Save Page</strong> to publish. The frontend at <code className="font-mono">/{slug}</code> reflects changes immediately.
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <SectionFormModal
          isNew={editingIndex === null}
          initial={editingIndex !== null ? sections[editingIndex] : buildEmpty('hero')}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}
