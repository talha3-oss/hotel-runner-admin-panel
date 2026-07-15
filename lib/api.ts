const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const isLocalHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

const normalizeAssetPath = (value: string) => encodeURI(value.trim().replace(/\\/g, '/'))

export function getApiAssetUrl(path?: string | null) {
  if (!path) return ''

  const normalizedPath = normalizeAssetPath(path)

  try {
    const directUrl = new URL(normalizedPath)

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      directUrl.protocol === 'http:' &&
      !isLocalHost(directUrl.hostname)
    ) {
      directUrl.protocol = 'https:'
    }

    return directUrl.toString()
  } catch {
    const baseUrl = new URL(API_BASE_URL)
    const assetUrl = new URL(normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`, baseUrl)

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      assetUrl.protocol === 'http:' &&
      !isLocalHost(assetUrl.hostname)
    ) {
      assetUrl.protocol = 'https:'
    }

    return assetUrl.toString()
  }
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function getAdminMe(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function updateAdminMe(token: string, data: { fullName?: string; email?: string; currentPassword?: string; newPassword?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return res.json();
}

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING'

export interface RoomTypeOption {
  id: string
  name: string
  key?: string
  description: string | null
  createdAt: string | null
  updatedAt: string | null
  derived: boolean
}

export interface Room {
  id: string
  hotelId: string | null
  hotelName?: string
  locationName?: string
  countryName?: string
  name: string
  roomNumber: string
  roomType: string
  capacity: number
  bedType: string
  size: string
  price: number
  status: RoomStatus
  description: string | null
  amenities: string[]
  images: string[]
  discount?: number
  childrenPrice?: number
  childrenAllowed?: boolean
  adultMinAge?: number
  createdAt: string
  updatedAt: string
}

export interface RoomPayload {
  hotelId: string
  name: string
  roomNumber?: string
  roomNumbers?: string[]
  roomCount?: number
  roomType: string
  capacity: number
  bedType: string
  size: string
  price: number
  status: RoomStatus
  description?: string
  amenities: string[]
  images?: string[]
  discount?: number
  childrenPrice?: number
  childrenAllowed?: boolean
  adultMinAge?: number
}

export interface UploadImageResult {
  success: boolean
  message?: string
  data?: {
    filename: string
    originalName: string
    fileUrl: string
    size: number
    mimetype: string
  }
}

export async function fetchAdminRooms(token: string, query: Record<string, string> = {}) {
  const queryString = new URLSearchParams(query).toString()
  const url = `${API_BASE_URL}/api/v1/admin/rooms${queryString ? `?${queryString}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    cache: 'no-store',
  })
  return res.json()
}

export async function fetchAdminRoomTypes(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/types`, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    cache: 'no-store',
  })
  return res.json()
}

export async function createAdminRoomType(token: string, payload: { name: string; key?: string; description?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateAdminRoomType(token: string, id: string, payload: { name?: string; key?: string; description?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteAdminRoomType(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/types/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createAdminRoom(token: string, payload: RoomPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateAdminRoom(token: string, roomId: string, payload: Partial<RoomPayload>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${roomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteAdminRoom(token: string, roomId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function uploadRoomImage(file: File): Promise<UploadImageResult> {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_BASE_URL}/upload-image-multer`, {
    method: 'POST',
    body: formData,
  })

  return res.json()
}

export type HotelStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface CountryTree {
  id: string
  name: string
  code: string
  flag?: string | null
  locations: Array<{
    id: string
    name: string
    active: boolean
    hotels: number
  }>
}

export interface LocationOption {
  id: string
  name: string
  active: boolean
  hotels: number
  countryId: string
  country: {
    id: string
    name: string
    code: string
  }
}

export interface Hotel {
  id: string
  propertyId?: string | null
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  status: HotelStatus
  rating?: number | null
  amenities: string[]
  image?: string | null
  shortDescription?: string | null
  description?: string | null
  heroImage?: string | null
  galleryImages: string[]
  nearbyPlaces?: unknown
  bookingExtras?: unknown
  bookingDefaults?: unknown
  detailContent?: unknown
  childrenAllowed?: boolean
  childrenPrice?: number
  adultMinAge?: number
  locationId: string
  location: string
  country: string
  rooms: number
}

export async function fetchCountriesTree(token: string, search = '') {
  const query = new URLSearchParams()
  if (search.trim()) query.set('search', search.trim())
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries/tree?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createCountry(token: string, payload: { name: string; code: string; flag?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateCountry(token: string, id: string, payload: { name?: string; code?: string; flag?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteCountry(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchLocations(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createLocation(token: string, payload: { name: string; countryId: string; active: boolean }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateLocation(
  token: string,
  id: string,
  payload: { name?: string; countryId?: string; active?: boolean }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteLocation(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchHotels(token: string, search = '') {
  const query = new URLSearchParams()
  if (search.trim()) query.set('search', search.trim())
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    cache: 'no-store',
  })
  return res.json()
}

export async function createHotel(
  token: string,
  payload: {
    name: string
    locationId: string
    address?: string
    phone?: string
    email?: string
    status?: HotelStatus
    rating?: number
    amenities?: string[]
    image?: string
    shortDescription?: string
    description?: string
    heroImage?: string
    galleryImages?: string[]
    nearbyPlaces?: unknown
    bookingExtras?: unknown
    bookingDefaults?: unknown
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateHotel(
  token: string,
  id: string,
  payload: {
    name?: string
    locationId?: string
    address?: string
    phone?: string
    email?: string
    status?: HotelStatus
    rating?: number
    amenities?: string[]
    image?: string
    shortDescription?: string
    description?: string
    heroImage?: string
    galleryImages?: string[]
    nearbyPlaces?: unknown
    bookingExtras?: unknown
    bookingDefaults?: unknown
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteHotel(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export type HomePageSectionType =
  | 'HERO'
  | 'TEXT'
  | 'CARD'
  | 'FEATURE'
  | 'CTA'
  | 'LOCATION'
  | 'FOOTER'
  | 'NEWSLETTER'
  | 'CUSTOM'

export type HomePageSectionStatus = 'ACTIVE' | 'INACTIVE'

export interface HomePageSection {
  id: string
  name: string
  sectionKey: string
  groupKey: string
  sectionType: HomePageSectionType
  status: HomePageSectionStatus
  sortOrder: number
  badge: string | null
  eyebrow: string | null
  title: string | null
  subtitle: string | null
  description: string | null
  buttonLabel: string | null
  buttonLink: string | null
  secondaryButtonLabel: string | null
  secondaryButtonLink: string | null
  image: string | null
  imageAlt: string | null
  content: unknown
  createdAt: string
  updatedAt: string
}

export interface HomePageSectionPayload {
  name: string
  sectionKey: string
  groupKey: string
  sectionType: HomePageSectionType
  status: HomePageSectionStatus
  sortOrder: number
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
  content?: string
  removeImage?: boolean
  image?: File | null
}

const buildHomePageSectionFormData = (payload: Partial<HomePageSectionPayload>) => {
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (value instanceof File) {
      formData.append(key, value)
      return
    }
    formData.append(key, String(value))
  })

  return formData
}

export async function fetchAdminHomePageSections(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createAdminHomePageSection(token: string, payload: HomePageSectionPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: buildHomePageSectionFormData(payload),
  })
  return res.json()
}

export async function updateAdminHomePageSection(
  token: string,
  id: string,
  payload: Partial<HomePageSectionPayload>
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: buildHomePageSectionFormData(payload),
  })
  return res.json()
}

export async function deleteAdminHomePageSection(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchPublicHomePageSections() {
  const res = await fetch(`${API_BASE_URL}/api/v1/homepage/sections`)
  return res.json()
}

export async function uploadHomepageSectionImage(file: File) {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_BASE_URL}/upload-image-multer`, {
    method: 'POST',
    body: formData,
  })

  return res.json()
}

export interface AdminUser {
  id: string
  email: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  status: string
  createdAt: string
  phoneNumber: string | null
  country: string | null
}

export async function fetchAllUsers(token: string, query: Record<string, string> = {}) {
  const qs = new URLSearchParams(query).toString()
  const url = `${API_BASE_URL}/api/v1/users/get-all${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    cache: 'no-store',
  })
  return res.json()
}

export async function updateAdminUser(
  token: string,
  id: string,
  payload: { firstName?: string; lastName?: string; phoneNumber?: string; country?: string; status?: string }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteAdminUser(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export interface CookieConsentRecord {
  id: string
  createdAt: string
  sessionId: string
  page: string | null
  analytics: boolean
  marketing: boolean
  functional: boolean
  necessary: boolean
  ipAddress: string | null
}

export interface CookieStats {
  total: number
  analyticsAccepted: number
  marketingAccepted: number
  functionalAccepted: number
  thisMonth: number
  analyticsRate: number
  marketingRate: number
}

export interface BookingRecord {
  id: string
  createdAt: string
  bookingRef: string
  status: string
  firstName: string
  lastName: string
  email: string
  phone: string
  hotelName: string
  checkIn: string
  checkOut: string
  nights: number
  adults: number
  children: number
  rooms: { id: string; name: string; publicRate: number; claytonRate: number }[]
  extras: { id: string; name: string; price: number; total: number }[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  paymentStatus: string
  invoice: { id: string; invoiceRef: string; status: string; sentAt: string | null } | null
}

export interface InvoiceRecord {
  id: string
  createdAt: string
  invoiceRef: string
  status: string
  sentAt: string | null
  booking: BookingRecord
}

export async function fetchAdminBookings(
  token: string,
  query: { search?: string; status?: string; page?: number; limit?: number } = {}
) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  ).toString()
  const res = await fetch(`${API_BASE_URL}/api/v1/bookings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function fetchAdminInvoices(
  token: string,
  query: { search?: string; page?: number; limit?: number } = {}
) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  ).toString()
  const res = await fetch(`${API_BASE_URL}/api/v1/bookings/invoices${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function updateBookingStatus(token: string, id: string, status: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
  return res.json()
}

export async function fetchCookieStats(
  token: string,
  query: { page?: number; limit?: number } = {}
) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))
  ).toString()
  const url = `${API_BASE_URL}/api/v1/cookies/stats${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function fetchDashboardStats(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/bookings/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function fetchHotelCount(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function fetchRoomCount(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

// ─── Landing Pages ────────────────────────────────────────────────────────────

export interface LandingPageMeta {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface PageSection {
  sectionKey: string
  sectionType: string
  groupKey: string
  sortOrder: number
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  badge: string | null
  eyebrow: string | null
  title: string | null
  subtitle: string | null
  description: string | null
  buttonLabel: string | null
  buttonLink: string | null
  secondaryButtonLabel: string | null
  secondaryButtonLink: string | null
  image: string | null
  imageAlt: string | null
  content: unknown
}

export async function fetchAdminPages(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/pages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function fetchAdminPageById(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/pages/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function createLandingPage(token: string, payload: { name: string; slug: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateLandingPage(
  token: string,
  id: string,
  payload: { name?: string; slug?: string; status?: string; sections?: unknown }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteLandingPage(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/pages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// ─── Navigation Menu ──────────────────────────────────────────────────────────

export interface NavItem {
  id?: string
  label: string
  href: string
  order: number
  visible: boolean
  openInNewTab: boolean
}

export async function fetchNavMenu(_token?: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/nav-menu`, {
    cache: 'no-store',
  })
  return res.json()
}

export async function saveNavMenu(token: string, items: NavItem[]) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/nav-menu`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items }),
  })
  return res.json()
}

// ── Coupons ──────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string
  code: string
  discount: number
  description: string | null
  isActive: boolean
  maxUses: number | null
  usedCount: number
  createdAt: string
  updatedAt: string
}

export type CouponPayload = {
  code: string
  discount: number
  description?: string
  isActive?: boolean
  maxUses?: number | null
}

export async function fetchAdminCoupons(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function createAdminCoupon(token: string, data: CouponPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateAdminCoupon(token: string, id: string, data: Partial<CouponPayload>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/coupons/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteAdminCoupon(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/coupons/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// ── FAQs ──────────────────────────────────────────────────────────────────────

export interface Faq {
  id: string
  question: string
  answer: string
  category: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type FaqPayload = {
  question: string
  answer: string
  category?: string
  sortOrder?: number
  isActive?: boolean
}

export async function fetchAdminFaqs(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/faqs/admin`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function createAdminFaq(token: string, data: FaqPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/faqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateAdminFaq(token: string, id: string, data: Partial<FaqPayload>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/faqs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteAdminFaq(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/faqs/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// ── Team Management ───────────────────────────────────────────────────────────

export const TEAM_MODULES = [
  { key: 'hotels', label: 'Hotels' },
  { key: 'locations', label: 'Countries & Locations' },
  { key: 'homepage', label: 'Homepage Content' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'ratePlans', label: 'Rate Plans' },
  { key: 'extras', label: 'Extras' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'blog', label: 'Blog' },
  { key: 'customers', label: 'Customers' },
  { key: 'payments', label: 'Payments' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'cookies', label: 'Cookie Consents' },
  { key: 'settings', label: 'Settings' },
] as const

export interface TeamMember {
  id: string
  email: string
  fullName: string | null
  roleLabel: string | null
  status: string
  isSuperAdmin: boolean
  permissions: string[]
  createdAt: string
}

export type TeamMemberPayload = {
  email?: string
  password?: string
  fullName: string
  roleLabel?: string
  permissions: string[]
  status?: string
}

export async function fetchTeamMembers(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/team`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function createTeamMember(token: string, data: TeamMemberPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateTeamMember(token: string, id: string, data: Partial<TeamMemberPayload>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/team/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteTeamMember(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/team/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// ── Blog ──────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  category: string | null
  tags: string[]
  author: string
  isPublished: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type BlogPayload = {
  title: string
  excerpt?: string
  content: string
  coverImage?: string
  category?: string
  tags?: string[]
  author?: string
  isPublished?: boolean
  sortOrder?: number
}

export async function fetchAdminBlogs(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/blog/admin`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}

export async function createAdminBlog(token: string, data: BlogPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/blog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateAdminBlog(token: string, id: string, data: Partial<BlogPayload>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/blog/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteAdminBlog(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/blog/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createAdminContentPage(token: string, name: string, slug: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/pages/admin/content-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, slug, sections: [] }),
  })
  return res.json()
}
