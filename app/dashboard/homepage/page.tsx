'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowPathIcon, DocumentDuplicateIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  createAdminHomePageSection,
  createLandingPage,
  fetchAdminHomePageSections,
  getApiAssetUrl,
  HomePageSection,
  HomePageSectionPayload,
  HomePageSectionStatus,
  HomePageSectionType,
  updateAdminHomePageSection,
  uploadHomepageSectionImage,
} from '../../../lib/api'

type EditorVariant =
  | 'hero'
  | 'story'
  | 'cards'
  | 'feature'
  | 'offer'
  | 'gift'
  | 'health'
  | 'footer'

type LinkItemDraft = {
  label: string
  href: string
}

type LocationCardDraft = {
  title: string
  linkLabel: string
  link: string
  image: string
  imageAlt: string
  imageFile: File | null
  imagePreview: string
}

type HomePageFormState = {
  id: string
  name: string
  status: HomePageSectionStatus
  badge: string
  eyebrow: string
  title: string
  subtitle: string
  description: string
  buttonLabel: string
  buttonLink: string
  secondaryButtonLabel: string
  secondaryButtonLink: string
  imageAlt: string
  imageFile: File | null
  imagePreview: string
  existingImagePreview: string
  removeImage: boolean
  heroLocationPlaceholder: string
  storySecondaryTitle: string
  storySecondaryDescription: string
  cards: LocationCardDraft[]
  newsletterTitle: string
  firstNamePlaceholder: string
  emailPlaceholder: string
  subscribeButtonLabel: string
  consentText: string
  privacyLabel: string
  privacyLink: string
  leftColumnTitle: string
  leftLinks: LinkItemDraft[]
  rightColumnTitle: string
  rightLinks: LinkItemDraft[]
  copyrightText: string
}

type SectionTemplate = {
  sectionKey: string
  name: string
  summary: string
  groupKey: string
  sectionType: HomePageSectionType
  sortOrder: number
  variant: EditorVariant
  defaults: {
    badge?: string
    eyebrow?: string
    title?: string
    subtitle?: string
    description?: string
    buttonLabel?: string
    buttonLink?: string
    secondaryButtonLabel?: string
    secondaryButtonLink?: string
    imageAlt?: string
    content?: Record<string, unknown>
  }
}

const createEmptyLink = (label = '', href = ''): LinkItemDraft => ({ label, href })

const createLocationCard = (
  title = '',
  linkLabel = 'Discover',
  link = '',
  image = '',
  imageAlt = ''
): LocationCardDraft => ({
  title,
  linkLabel,
  link,
  image,
  imageAlt,
  imageFile: null,
  imagePreview: image ? getApiAssetUrl(image) : '',
})

const DEFAULT_LOCATION_CARDS = [
  createLocationCard('Luxhotels Hotel Amsterdam American', 'Discover', '/locations/amsterdam'),
  createLocationCard('Luxhotels Hotel Dusseldorf', 'Discover', '/locations/dusseldorf'),
  createLocationCard('Hotels in London', 'Discover', '/locations/london'),
  createLocationCard('Hotels in Dublin', 'Discover', '/locations/dublin'),
]

const DEFAULT_LEFT_LINKS = [
  createEmptyLink('Gift Cards', '/gift-cards'),
  createEmptyLink('Special Offers', '/special-offers'),
  createEmptyLink('Contact Us', '/contact'),
  createEmptyLink('Sitemap', '/sitemap'),
  createEmptyLink('Luxhotels Hotel FAQs', '/faqs'),
  createEmptyLink('Corporate Rates', '/corporate-rates'),
]

const DEFAULT_RIGHT_LINKS = [
  createEmptyLink('Gift Cards', '/gift-cards'),
  createEmptyLink('Special Offers', '/special-offers'),
  createEmptyLink('Contact Us', '/contact'),
  createEmptyLink('Sitemap', '/sitemap'),
  createEmptyLink('Luxhotels Hotel FAQs', '/faqs'),
  createEmptyLink('Corporate Rates', '/corporate-rates'),
]

const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    sectionKey: 'hotels-hero-banner',
    name: 'Hero Welcome Banner',
    summary: 'Screenshot 1: hero banner with the welcome copy, booking CTA, and location selector.',
    groupKey: 'hotels',
    sectionType: 'HERO',
    sortOrder: 10,
    variant: 'hero',
    defaults: {
      badge: 'HOTELS',
      eyebrow: 'Welcome to Luxotel',
      title: "where it's personal",
      buttonLabel: 'BOOK NOW',
      buttonLink: '/book',
      imageAlt: 'Hotels hero banner',
      content: {
        locationPlaceholder: 'Choose your location',
      },
    },
  },
  {
    sectionKey: 'hotels-story-intro',
    name: 'Hotels Story Intro',
    summary: 'Screenshot 2: the brand story intro plus the Our Locations text block.',
    groupKey: 'hotels',
    sectionType: 'TEXT',
    sortOrder: 20,
    variant: 'story',
    defaults: {
      title: "At Luxhotels Hotels, we're dedicated to experiences centred around you, our guest.",
      description:
        "We know a personal touch is about human connection in all its wonderful ways, from small gestures to going the extra mile. When it's done personally, we'll make your day one to remember.",
      content: {
        secondaryTitle: 'Our Locations',
        secondaryDescription:
          "Discover Luxhotels Hotels, centrally located in cities across Ireland, the UK, Germany and the Netherlands. At Luxhotels Hotels, 'it's Personal' isn't just a phrase; it's our promise to you. We're not in the business of transactions; we're in the business of interactions. Welcome to an experience about you and us.",
      },
    },
  },
  {
    sectionKey: 'hotels-location-cards',
    name: 'Locations Card Grid',
    summary: 'Screenshot 3: card grid for city and hotel highlights with individual image upload per card.',
    groupKey: 'locations',
    sectionType: 'LOCATION',
    sortOrder: 30,
    variant: 'cards',
    defaults: {
      title: 'Location Cards',
      description: 'Manage the location cards shown on the hotels page.',
      content: {
        cards: DEFAULT_LOCATION_CARDS.map((card) => ({
          title: card.title,
          linkLabel: card.linkLabel,
          link: card.link,
          image: card.image,
          imageAlt: card.imageAlt,
        })),
      },
    },
  },
  {
    sectionKey: 'hotels-dining-feature',
    name: 'Dining Experience Feature',
    summary: 'Screenshot 4: dining feature with a full-width image and primary CTA.',
    groupKey: 'experiences',
    sectionType: 'FEATURE',
    sortOrder: 40,
    variant: 'feature',
    defaults: {
      title: 'Experience flavour',
      description:
        'Discover a world of flavours at Luxhotels Hotels, from the perfect start to your day with our Vitality Breakfast to our signature Red Bean Roastery coffee, prepared with care and attention by our expert baristas. Our hotels offer a unique culinary experience for you to enjoy from locally sourced dishes to Japanese Teppanyaki and Dutch Bitterballen.',
      buttonLabel: 'Explore Dining',
      buttonLink: '/dining',
      imageAlt: 'Dining experience section',
    },
  },
  {
    sectionKey: 'hotels-book-direct-offer',
    name: 'Book Direct Offer',
    summary: 'Screenshot 5: light CTA block for direct booking offers.',
    groupKey: 'offers',
    sectionType: 'CTA',
    sortOrder: 50,
    variant: 'offer',
    defaults: {
      title: 'Book Direct with Click on Luxhotels',
      description: 'Save on every room, every night when you Click on Luxhotels',
      buttonLabel: 'Explore Offer',
      buttonLink: '/offers/book-direct',
      imageAlt: 'Book direct offer graphic',
    },
  },
  {
    sectionKey: 'hotels-business-feature',
    name: 'Business Events Feature',
    summary: 'Screenshot 6: meetings and conference venues feature with CTA.',
    groupKey: 'experiences',
    sectionType: 'FEATURE',
    sortOrder: 60,
    variant: 'feature',
    defaults: {
      title: 'Business done personally',
      description:
        'State of the art technology, inviting decor, exquisite catering and our dedicated meeting and events teams ensure that all your meetings run as smoothly as possible.',
      buttonLabel: 'Explore our Conference Venues',
      buttonLink: '/conference-venues',
      imageAlt: 'Business events feature section',
    },
  },
  {
    sectionKey: 'hotels-gift-cards',
    name: 'Gift Cards Feature',
    summary: 'Screenshot 7: centered gift card promotion with image and button.',
    groupKey: 'offers',
    sectionType: 'CTA',
    sortOrder: 70,
    variant: 'gift',
    defaults: {
      title: "A gift that's more personal",
      description:
        'Show you care, with a gift that gives memories that last forever. With over 53 hotel destinations to choose across Ireland, the UK and continental Europe, a stay with us is always more personal.',
      buttonLabel: 'Shop',
      buttonLink: '/gift-cards',
      imageAlt: 'Gift cards feature image',
    },
  },
  {
    sectionKey: 'hotels-health-safety',
    name: 'Health & Safety Promise',
    summary: 'Screenshot 8: image-led reassurance section with a Read More CTA.',
    groupKey: 'trust',
    sectionType: 'FEATURE',
    sortOrder: 80,
    variant: 'health',
    defaults: {
      description:
        'Our continued commitment to the health, safety & well-being of our guests & employees is of paramount importance at Luxhotels Hotels. Guests can be reassured that all our hotels are subject to rigorous inspections by Bureau Veritas, a world leader in health & safety standards.',
      buttonLabel: 'Read More',
      buttonLink: '/health-safety',
      imageAlt: 'Health and safety reassurance image',
    },
  },
  {
    sectionKey: 'hotels-newsletter-footer',
    name: 'Newsletter & Footer',
    summary: 'Screenshot 9: newsletter signup and the two footer link columns.',
    groupKey: 'footer',
    sectionType: 'FOOTER',
    sortOrder: 90,
    variant: 'footer',
    defaults: {
      content: {
        newsletterTitle: 'Sign Up for Exclusive Offers',
        firstNamePlaceholder: 'First Name*',
        emailPlaceholder: 'Email Address*',
        subscribeButtonLabel: 'Subscribe',
        consentText:
          'By clicking subscribe, you agree to our Terms and that you have read our Privacy Policy',
        privacyLabel: 'Privacy Policy',
        privacyLink: '/privacy-policy',
        leftColumnTitle: 'LuxHotel',
        leftLinks: DEFAULT_LEFT_LINKS,
        rightColumnTitle: 'Useful Links',
        rightLinks: DEFAULT_RIGHT_LINKS,
        copyrightText: `© ${new Date().getFullYear()} Luxotel. All rights reserved.`,
      },
    },
  },
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

const cloneLinks = (links: LinkItemDraft[]) => links.map((item) => ({ ...item }))

const normalizeLinks = (value: unknown, fallback: LinkItemDraft[]) => {
  if (!Array.isArray(value)) return cloneLinks(fallback)

  const normalized = value
    .filter(isRecord)
    .map((item) => ({
      label: readString(item.label),
      href: readString(item.href),
    }))

  return normalized.length ? normalized : cloneLinks(fallback)
}

const normalizeCards = (value: unknown, fallback: LocationCardDraft[]) => {
  if (!Array.isArray(value)) {
    return fallback.map((card) => ({ ...card }))
  }

  const normalized = value
    .filter(isRecord)
    .map((item) =>
      createLocationCard(
        readString(item.title),
        readString(item.linkLabel, 'Discover'),
        readString(item.link),
        readString(item.image),
        readString(item.imageAlt)
      )
    )

  return normalized.length ? normalized : fallback.map((card) => ({ ...card }))
}

const getTemplateByKey = (sectionKey: string) =>
  SECTION_TEMPLATES.find((template) => template.sectionKey === sectionKey)

const createFormFromSection = (template: SectionTemplate, section?: HomePageSection): HomePageFormState => {
  const defaults = template.defaults
  const content = isRecord(section?.content) ? section.content : {}
  const defaultContent = defaults.content || {}

  return {
    id: section?.id || '',
    name: section?.name || template.name,
    status: section?.status || 'ACTIVE',
    badge: section?.badge || defaults.badge || '',
    eyebrow: section?.eyebrow || defaults.eyebrow || '',
    title: section?.title || defaults.title || '',
    subtitle: section?.subtitle || defaults.subtitle || '',
    description: section?.description || defaults.description || '',
    buttonLabel: section?.buttonLabel || defaults.buttonLabel || '',
    buttonLink: section?.buttonLink || defaults.buttonLink || '',
    secondaryButtonLabel: section?.secondaryButtonLabel || defaults.secondaryButtonLabel || '',
    secondaryButtonLink: section?.secondaryButtonLink || defaults.secondaryButtonLink || '',
    imageAlt: section?.imageAlt || defaults.imageAlt || '',
    imageFile: null,
    imagePreview: section?.image ? getApiAssetUrl(section.image) : '',
    existingImagePreview: section?.image ? getApiAssetUrl(section.image) : '',
    removeImage: false,
    heroLocationPlaceholder: readString(
      content.locationPlaceholder,
      readString(defaultContent.locationPlaceholder, 'Choose your location')
    ),
    storySecondaryTitle: readString(
      content.secondaryTitle,
      readString(defaultContent.secondaryTitle, 'Our Locations')
    ),
    storySecondaryDescription: readString(
      content.secondaryDescription,
      readString(defaultContent.secondaryDescription)
    ),
    cards: normalizeCards(content.cards, normalizeCards(defaultContent.cards, DEFAULT_LOCATION_CARDS)),
    newsletterTitle: readString(
      content.newsletterTitle,
      readString(defaultContent.newsletterTitle, 'Sign Up for Exclusive Offers')
    ),
    firstNamePlaceholder: readString(
      content.firstNamePlaceholder,
      readString(defaultContent.firstNamePlaceholder, 'First Name*')
    ),
    emailPlaceholder: readString(
      content.emailPlaceholder,
      readString(defaultContent.emailPlaceholder, 'Email Address*')
    ),
    subscribeButtonLabel: readString(
      content.subscribeButtonLabel,
      readString(defaultContent.subscribeButtonLabel, 'Subscribe')
    ),
    consentText: readString(content.consentText, readString(defaultContent.consentText)),
    privacyLabel: readString(content.privacyLabel, readString(defaultContent.privacyLabel, 'Privacy Policy')),
    privacyLink: readString(content.privacyLink, readString(defaultContent.privacyLink, '/privacy-policy')),
    leftColumnTitle: readString(content.leftColumnTitle, readString(defaultContent.leftColumnTitle, 'LuxHotel')),
    leftLinks: normalizeLinks(content.leftLinks, normalizeLinks(defaultContent.leftLinks, DEFAULT_LEFT_LINKS)),
    rightColumnTitle: readString(content.rightColumnTitle, readString(defaultContent.rightColumnTitle, 'Useful Links')),
    rightLinks: normalizeLinks(content.rightLinks, normalizeLinks(defaultContent.rightLinks, DEFAULT_RIGHT_LINKS)),
    copyrightText: readString(content.copyrightText, readString(defaultContent.copyrightText, `© ${new Date().getFullYear()} Luxotel. All rights reserved.`)),
  }
}

const buildSectionContent = (template: SectionTemplate, form: HomePageFormState) => {
  if (template.variant === 'hero') {
    return {
      locationPlaceholder: form.heroLocationPlaceholder.trim(),
    }
  }

  if (template.variant === 'story') {
    return {
      secondaryTitle: form.storySecondaryTitle.trim(),
      secondaryDescription: form.storySecondaryDescription.trim(),
    }
  }

  if (template.variant === 'cards') {
    return {
      cards: form.cards.map((card) => ({
        title: card.title.trim(),
        linkLabel: card.linkLabel.trim(),
        link: card.link.trim(),
        image: card.image,
        imageAlt: card.imageAlt.trim(),
      })),
    }
  }

  if (template.variant === 'footer') {
    return {
      newsletterTitle: form.newsletterTitle.trim(),
      firstNamePlaceholder: form.firstNamePlaceholder.trim(),
      emailPlaceholder: form.emailPlaceholder.trim(),
      subscribeButtonLabel: form.subscribeButtonLabel.trim(),
      consentText: form.consentText.trim(),
      privacyLabel: form.privacyLabel.trim(),
      privacyLink: form.privacyLink.trim(),
      leftColumnTitle: form.leftColumnTitle.trim(),
      leftLinks: form.leftLinks.map((item) => ({
        label: item.label.trim(),
        href: item.href.trim(),
      })),
      rightColumnTitle: form.rightColumnTitle.trim(),
      rightLinks: form.rightLinks.map((item) => ({
        label: item.label.trim(),
        href: item.href.trim(),
      })),
      copyrightText: form.copyrightText.trim(),
    }
  }

  return {}
}

const buildTemplatePayload = (template: SectionTemplate): HomePageSectionPayload => {
  const form = createFormFromSection(template)
  return {
    name: template.name,
    sectionKey: template.sectionKey,
    groupKey: template.groupKey,
    sectionType: template.sectionType,
    status: 'ACTIVE',
    sortOrder: template.sortOrder,
    badge: form.badge.trim(),
    eyebrow: form.eyebrow.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    buttonLabel: form.buttonLabel.trim(),
    buttonLink: form.buttonLink.trim(),
    secondaryButtonLabel: form.secondaryButtonLabel.trim(),
    secondaryButtonLink: form.secondaryButtonLink.trim(),
    imageAlt: form.imageAlt.trim(),
    content: JSON.stringify(buildSectionContent(template, form)),
  }
}

const statusClasses = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
}

export default function HomePageContentPage() {
  const [sections, setSections] = useState<HomePageSection[]>([])
  const [selectedSectionKey, setSelectedSectionKey] = useState(SECTION_TEMPLATES[0].sectionKey)
  const [form, setForm] = useState<HomePageFormState>(() => createFormFromSection(SECTION_TEMPLATES[0]))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedTemplate = useMemo(
    () => getTemplateByKey(selectedSectionKey) || SECTION_TEMPLATES[0],
    [selectedSectionKey]
  )

  const selectedSection = useMemo(
    () => sections.find((section) => section.sectionKey === selectedTemplate.sectionKey),
    [sections, selectedTemplate.sectionKey]
  )

  const loadSections = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await fetchAdminHomePageSections(token)
      if (!result.success) {
        throw new Error(result.message || 'Failed to load homepage content.')
      }

      let fetchedSections = result.sections || []
      const existingKeys = new Set(fetchedSections.map((section: HomePageSection) => section.sectionKey))
      const missingTemplates = SECTION_TEMPLATES.filter((template) => !existingKeys.has(template.sectionKey))

      if (missingTemplates.length) {
        for (const template of missingTemplates) {
          const createResult = await createAdminHomePageSection(token, buildTemplatePayload(template))
          if (!createResult.success && createResult.message !== 'Section key already exists.') {
            throw new Error(createResult.message || `Failed to create ${template.name}.`)
          }
        }

        const refreshed = await fetchAdminHomePageSections(token)
        if (!refreshed.success) {
          throw new Error(refreshed.message || 'Failed to refresh homepage content.')
        }
        fetchedSections = refreshed.sections || []
        setSuccessMessage('Screenshot-based homepage sections are ready to edit.')
      }

      setSections(fetchedSections)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect to server.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  useEffect(() => {
    setForm(createFormFromSection(selectedTemplate, selectedSection))
  }, [selectedSection, selectedTemplate])

  const handleTextChange = (key: keyof HomePageFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleMainImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : prev.existingImagePreview,
      removeImage: false,
    }))
  }

  const handleCardChange = (index: number, key: keyof LocationCardDraft, value: string) => {
    setForm((prev) => ({
      ...prev,
      cards: prev.cards.map((card, cardIndex) => (cardIndex === index ? { ...card, [key]: value } : card)),
    }))
  }

  const handleCardImageChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setForm((prev) => ({
      ...prev,
      cards: prev.cards.map((card, cardIndex) =>
        cardIndex === index
          ? {
              ...card,
              imageFile: file,
              imagePreview: file ? URL.createObjectURL(file) : card.imagePreview,
            }
          : card
      ),
    }))
  }

  const addCard = () => {
    setForm((prev) => ({
      ...prev,
      cards: [...prev.cards, createLocationCard()],
    }))
  }

  const removeCard = (index: number) => {
    setForm((prev) => ({
      ...prev,
      cards: prev.cards.filter((_, cardIndex) => cardIndex !== index),
    }))
  }

  const clearCardImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      cards: prev.cards.map((card, cardIndex) =>
        cardIndex === index
          ? {
              ...card,
              image: '',
              imageFile: null,
              imagePreview: '',
            }
          : card
      ),
    }))
  }

  const updateLinks = (column: 'leftLinks' | 'rightLinks', nextLinks: LinkItemDraft[]) => {
    setForm((prev) => ({
      ...prev,
      [column]: nextLinks,
    }))
  }

  const handleLinkChange = (
    column: 'leftLinks' | 'rightLinks',
    index: number,
    key: keyof LinkItemDraft,
    value: string
  ) => {
    const links = column === 'leftLinks' ? form.leftLinks : form.rightLinks
    const nextLinks = links.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    updateLinks(column, nextLinks)
  }

  const addLink = (column: 'leftLinks' | 'rightLinks') => {
    const links = column === 'leftLinks' ? form.leftLinks : form.rightLinks
    updateLinks(column, [...links, createEmptyLink()])
  }

  const removeLink = (column: 'leftLinks' | 'rightLinks', index: number) => {
    const links = column === 'leftLinks' ? form.leftLinks : form.rightLinks
    updateLinks(
      column,
      links.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  const uploadCardImagesIfNeeded = async () => {
    const nextCards = [...form.cards]

    for (let index = 0; index < nextCards.length; index += 1) {
      const card = nextCards[index]
      if (!card.imageFile) continue

      const uploadResult = await uploadHomepageSectionImage(card.imageFile)
      if (!uploadResult.success || !uploadResult.data?.fileUrl) {
        throw new Error(uploadResult.message || `Failed to upload image for card ${index + 1}.`)
      }

      nextCards[index] = {
        ...card,
        image: uploadResult.data.fileUrl,
        imageFile: null,
        imagePreview: getApiAssetUrl(uploadResult.data.fileUrl),
      }
    }

    return nextCards
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccessMessage('')

      let nextCards = form.cards
      if (selectedTemplate.variant === 'cards') {
        nextCards = await uploadCardImagesIfNeeded()
      }

      const payload: HomePageSectionPayload = {
        name: form.name.trim(),
        sectionKey: selectedTemplate.sectionKey,
        groupKey: selectedTemplate.groupKey,
        sectionType: selectedTemplate.sectionType,
        status: form.status,
        sortOrder: selectedTemplate.sortOrder,
        badge: form.badge.trim(),
        eyebrow: form.eyebrow.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        buttonLabel: form.buttonLabel.trim(),
        buttonLink: form.buttonLink.trim(),
        secondaryButtonLabel: form.secondaryButtonLabel.trim(),
        secondaryButtonLink: form.secondaryButtonLink.trim(),
        imageAlt: form.imageAlt.trim(),
        removeImage: form.removeImage,
        image: form.imageFile,
        content: JSON.stringify(
          buildSectionContent(selectedTemplate, {
            ...form,
            cards: nextCards,
          })
        ),
      }

      const result = form.id
        ? await updateAdminHomePageSection(token, form.id, payload)
        : await createAdminHomePageSection(token, payload)

      if (!result.success) {
        throw new Error(result.message || 'Failed to save homepage section.')
      }

      setSuccessMessage(result.message || `${selectedTemplate.name} saved successfully.`)
      await loadSections()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect to server.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const renderMainImageEditor = (label: string) => (
    <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">Current Image</p>
        {form.imagePreview ? (
          <img
            src={form.imagePreview}
            alt={form.imageAlt || form.name}
            className="h-44 w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex h-44 items-center justify-center rounded-md bg-white text-gray-300">
            <PhotoIcon className="h-10 w-10" />
          </div>
        )}

        {(form.imagePreview || form.existingImagePreview) && (
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.removeImage}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  removeImage: event.target.checked,
                  imageFile: event.target.checked ? null : prev.imageFile,
                  imagePreview: event.target.checked ? '' : prev.existingImagePreview,
                }))
              }
            />
            Remove current image
          </label>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-600"
            onChange={handleMainImageChange}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Image Alt Text
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={form.imageAlt}
            onChange={(event) => handleTextChange('imageAlt', event.target.value)}
            placeholder="Describe the image for accessibility"
          />
        </label>
      </div>
    </div>
  )

  const renderLinkEditor = (
    title: string,
    column: 'leftLinks' | 'rightLinks',
    headingKey: 'leftColumnTitle' | 'rightColumnTitle'
  ) => {
    const links = column === 'leftLinks' ? form.leftLinks : form.rightLinks

    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={() => addLink(column)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <span className="text-base leading-none">+</span> Add Link
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Column title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Column Title
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              value={form[headingKey]}
              onChange={(event) => handleTextChange(headingKey, event.target.value)}
            />
          </div>

          {/* Links list */}
          {links.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">No links yet — click Add Link to start.</p>
          )}
          <div className="space-y-2">
            {links.map((item, index) => (
              <div
                key={`${column}-${index}`}
                className="group flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 hover:border-gray-300 transition-colors"
              >
                {/* Index badge */}
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-bold">
                  {index + 1}
                </span>

                {/* Label input */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Label</p>
                  <input
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
                    placeholder="e.g. Contact Us"
                    value={item.label}
                    onChange={(event) => handleLinkChange(column, index, 'label', event.target.value)}
                  />
                </div>

                {/* URL input */}
                <div className="flex-[1.5] min-w-0">
                  <p className="text-xs text-gray-400 mb-1">URL</p>
                  <input
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
                    placeholder="/contact"
                    value={item.href}
                    onChange={(event) => handleLinkChange(column, index, 'href', event.target.value)}
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeLink(column, index)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderVariantFields = () => {
    if (selectedTemplate.variant === 'hero') {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Small Label
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.badge}
                onChange={(event) => handleTextChange('badge', event.target.value)}
                placeholder="HOTELS"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Intro Line
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.eyebrow}
                onChange={(event) => handleTextChange('eyebrow', event.target.value)}
                placeholder="Welcome to Luxotel"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 md:col-span-2">
              Main Heading
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.title}
                onChange={(event) => handleTextChange('title', event.target.value)}
                placeholder="where it's personal"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Location Placeholder
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.heroLocationPlaceholder}
                onChange={(event) => handleTextChange('heroLocationPlaceholder', event.target.value)}
                placeholder="Choose your location"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Button Label
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.buttonLabel}
                onChange={(event) => handleTextChange('buttonLabel', event.target.value)}
                placeholder="BOOK NOW"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 md:col-span-2">
              Button Link
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.buttonLink}
                onChange={(event) => handleTextChange('buttonLink', event.target.value)}
                placeholder="/book"
              />
            </label>
          </div>

          {renderMainImageEditor('Hero Background Image')}
        </div>
      )
    }

    if (selectedTemplate.variant === 'story') {
      return (
        <div className="grid gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Main Story Heading
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.title}
              onChange={(event) => handleTextChange('title', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Main Story Paragraph
            <textarea
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.description}
              onChange={(event) => handleTextChange('description', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Secondary Heading
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.storySecondaryTitle}
              onChange={(event) => handleTextChange('storySecondaryTitle', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Secondary Paragraph
            <textarea
              rows={5}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.storySecondaryDescription}
              onChange={(event) => handleTextChange('storySecondaryDescription', event.target.value)}
            />
          </label>
        </div>
      )
    }

    if (selectedTemplate.variant === 'cards') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Location Cards</h3>
              <p className="text-sm text-gray-500">Each card has its own title, link, and image upload.</p>
            </div>
            <button
              type="button"
              onClick={addCard}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Add Card
            </button>
          </div>

          <div className="space-y-4">
            {form.cards.map((card, index) => (
              <div key={`card-${index}`} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Card {index + 1}</h4>
                  {form.cards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Remove Card
                    </button>
                  )}
                </div>

                <div className="grid gap-4 xl:grid-cols-[220px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">Card Image</p>
                    {card.imagePreview ? (
                      <img src={card.imagePreview} alt={card.imageAlt || card.title} className="h-36 w-full rounded-md object-cover" />
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-md bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}

                    {card.imagePreview && (
                      <button
                        type="button"
                        onClick={() => clearCardImage(index)}
                        className="mt-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700 md:col-span-2">
                      Card Title
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={card.title}
                        onChange={(event) => handleCardChange(index, 'title', event.target.value)}
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Link Label
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={card.linkLabel}
                        onChange={(event) => handleCardChange(index, 'linkLabel', event.target.value)}
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Link URL
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={card.link}
                        onChange={(event) => handleCardChange(index, 'link', event.target.value)}
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Card Image Alt Text
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={card.imageAlt}
                        onChange={(event) => handleCardChange(index, 'imageAlt', event.target.value)}
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Upload Card Image
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1 block w-full text-sm text-gray-600"
                        onChange={(event) => handleCardImageChange(index, event)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (selectedTemplate.variant === 'footer') {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 md:col-span-2">
              Newsletter Heading
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.newsletterTitle}
                onChange={(event) => handleTextChange('newsletterTitle', event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              First Name Placeholder
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.firstNamePlaceholder}
                onChange={(event) => handleTextChange('firstNamePlaceholder', event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Email Placeholder
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.emailPlaceholder}
                onChange={(event) => handleTextChange('emailPlaceholder', event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Subscribe Button Label
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.subscribeButtonLabel}
                onChange={(event) => handleTextChange('subscribeButtonLabel', event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Privacy Link
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.privacyLink}
                onChange={(event) => handleTextChange('privacyLink', event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 md:col-span-2">
              Consent Text
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.consentText}
                onChange={(event) => handleTextChange('consentText', event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Privacy Label
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.privacyLabel}
                onChange={(event) => handleTextChange('privacyLabel', event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {renderLinkEditor('Left Footer Column', 'leftLinks', 'leftColumnTitle')}
            {renderLinkEditor('Right Footer Column', 'rightLinks', 'rightColumnTitle')}
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Copyright Text
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.copyrightText}
              onChange={(event) => handleTextChange('copyrightText', event.target.value)}
            />
          </label>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Heading
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.title}
              onChange={(event) => handleTextChange('title', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Description
            <textarea
              rows={5}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.description}
              onChange={(event) => handleTextChange('description', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Button Label
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.buttonLabel}
              onChange={(event) => handleTextChange('buttonLabel', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Button Link
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.buttonLink}
              onChange={(event) => handleTextChange('buttonLink', event.target.value)}
            />
          </label>
        </div>

        {renderMainImageEditor(
          selectedTemplate.variant === 'offer' ? 'Optional CTA Graphic' : 'Feature Image'
        )}
      </div>
    )
  }

  // ── Duplicate as Page modal ──────────────────────────────────────────────
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [dupName, setDupName] = useState('')
  const [dupSlug, setDupSlug] = useState('')
  const [duplicating, setDuplicating] = useState(false)
  const [dupError, setDupError] = useState('')
  const [dupSuccess, setDupSuccess] = useState('')

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dupName.trim() || !dupSlug.trim()) { setDupError('Name and URL slug are required.'); return }
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setDuplicating(true)
    setDupError('')
    try {
      const result = await createLandingPage(token, { name: dupName.trim(), slug: dupSlug.trim() })
      if (result.success) {
        setDupSuccess(`Page "${dupName}" created at /${dupSlug}`)
        setDupName('')
        setDupSlug('')
        setTimeout(() => { setShowDuplicate(false); setDupSuccess('') }, 2000)
      } else {
        setDupError(result.message || 'Failed to create page.')
      }
    } catch { setDupError('Unable to connect.') }
    finally { setDuplicating(false) }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Content</h1>
          <p className="mt-1 text-sm text-gray-600">
            Each screenshot now has its own named section with simple text fields and multer-based image upload.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Public API for your website: <span className="font-semibold text-gray-700">/api/v1/homepage/sections</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowDuplicate(true); setDupError(''); setDupSuccess('') }}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            Duplicate as New Page
          </button>
          <button
            onClick={loadSections}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowPathIcon className="mr-2 h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Duplicate modal */}
      {showDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Duplicate Homepage as New Page</h2>
              <button onClick={() => setShowDuplicate(false)} className="text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleDuplicate} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                This copies all current homepage sections into an independent page you can edit separately.
              </p>
              {dupError && <p className="text-sm text-red-600">{dupError}</p>}
              {dupSuccess && <p className="text-sm text-green-600">{dupSuccess}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Summer Offers"
                  value={dupName}
                  onChange={(e) => {
                    setDupName(e.target.value)
                    if (!dupSlug || dupSlug === slugify(dupName)) setDupSlug(slugify(e.target.value))
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
                    value={dupSlug}
                    onChange={(e) => setDupSlug(slugify(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={duplicating}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {duplicating ? 'Creating…' : 'Create Page'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicate(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {successMessage && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{selectedTemplate.summary}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                form.status === 'ACTIVE' ? statusClasses.ACTIVE : statusClasses.INACTIVE
              }`}
            >
              {form.status}
            </span>
          </div>

          <form onSubmit={submitForm} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Section Name
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={form.name}
                  onChange={(event) => handleTextChange('name', event.target.value)}
                  placeholder={selectedTemplate.name}
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Status
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={form.status}
                  onChange={(event) => handleTextChange('status', event.target.value as HomePageSectionStatus)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>

              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                <span className="font-medium text-gray-800">Section Key:</span> {selectedTemplate.sectionKey}
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                <span className="font-medium text-gray-800">Group:</span> {selectedTemplate.groupKey}
              </div>
            </div>

            {renderVariantFields()}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : `Save ${selectedTemplate.name}`}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Screenshot Sections</h2>
              <p className="text-sm text-gray-500">Click any section to edit its copy and images.</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              {sections.length}/{SECTION_TEMPLATES.length}
            </span>
          </div>

          {loading ? (
            <div className="rounded-md bg-gray-50 px-4 py-6 text-sm text-gray-600">Loading homepage sections...</div>
          ) : (
            <div className="space-y-3">
              {SECTION_TEMPLATES.map((template) => {
                const section = sections.find((item) => item.sectionKey === template.sectionKey)
                const previewText = section?.title || section?.description || template.summary

                return (
                  <button
                    key={template.sectionKey}
                    type="button"
                    onClick={() => {
                      setSelectedSectionKey(template.sectionKey)
                      setSuccessMessage('')
                      setError('')
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedTemplate.sectionKey === template.sectionKey
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {section?.image ? (
                          <img
                            src={getApiAssetUrl(section.image)}
                            alt={section.imageAlt || section.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-300">
                            <PhotoIcon className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{section?.name || template.name}</h3>
                            <p className="text-xs text-gray-500">{template.sectionKey}</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              section?.status === 'ACTIVE' ? statusClasses.ACTIVE : statusClasses.INACTIVE
                            }`}
                          >
                            {section?.status || 'ACTIVE'}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{previewText}</p>
                        <p className="mt-2 text-xs text-gray-400">{template.summary}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
